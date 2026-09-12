import { createClient } from 'npm:@supabase/supabase-js@2'

const PROD_ORIGIN = 'https://officialsipmate.com'
const allowedOrigins = new Set([
  PROD_ORIGIN,
  'https://www.officialsipmate.com',
  'http://localhost:8081',
  'http://localhost:8082',
  'http://localhost:19006',
])

function corsHeaders(req: Request) {
  const origin = req.headers.get('origin')
  const allowOrigin = origin && allowedOrigins.has(origin) ? origin : PROD_ORIGIN
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

const MONTHLY_PRICE_ID = 'price_1UAAwKF9keqz65yeAB2gM6y1'
const FOUNDERS_YEARLY_PRICE_ID = 'price_1UAB3YF9keqz65yetpOin6EL'
const EARLY_YEARLY_PRICE_ID = 'price_1UAYX3F9keqz65ye433hIOYb'
const STANDARD_YEARLY_PRICE_ID = 'price_1UAYYNF9keqz65yeaT62ebxl'

function jsonResponse(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  })
}

function getCheckoutOrigin(req: Request) {
  const configuredOrigin = Deno.env.get('APP_WEB_URL')
  if (configuredOrigin) {
    try {
      const parsed = new URL(configuredOrigin)
      if (parsed.protocol === 'https:' || parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
        return parsed.origin
      }
    } catch {
      // Use the safe production origin below.
    }
  }

  const requestOrigin = req.headers.get('origin')
  if (requestOrigin && allowedOrigins.has(requestOrigin)) return new URL(requestOrigin).origin
  return PROD_ORIGIN
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  if (req.method !== 'POST') return jsonResponse(req, { error: 'Method not allowed' }, 405)

  try {
    const originHeader = req.headers.get('origin')
    if (originHeader && !allowedOrigins.has(originHeader)) {
      return jsonResponse(req, { error: 'Origin not allowed' }, 403)
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonResponse(req, { error: 'Not authenticated' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!supabaseUrl || !supabaseAnonKey || !stripeSecretKey) {
      console.error('CHECKOUT FUNCTION CONFIGURATION ERROR')
      return jsonResponse(req, { error: 'Premium checkout is temporarily unavailable.' }, 503)
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    })

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return jsonResponse(req, { error: 'Invalid user session' }, 401)

    const { data: activeSubscription, error: subscriptionError } = await supabase
      .from('premium_subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()

    if (subscriptionError) throw subscriptionError
    if (activeSubscription) {
      return jsonResponse(req, { error: 'You already have an active Premium subscription.' }, 409)
    }

    let body: { plan?: unknown }
    try { body = await req.json() } catch { return jsonResponse(req, { error: 'Invalid request body' }, 400) }

    const plan = body.plan
    let priceId: string

    if (plan === 'monthly') {
      priceId = MONTHLY_PRICE_ID
    } else if (plan === 'yearly') {
      const { data: activeYearlyOffer, error: offerError } = await supabase
        .from('premium_offers')
        .select('code,max_subscribers,subscriber_count')
        .eq('billing_period', 'yearly')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (offerError) throw offerError
      if (!activeYearlyOffer) throw new Error('No active yearly Premium offer')
      if (activeYearlyOffer.max_subscribers != null && activeYearlyOffer.subscriber_count >= activeYearlyOffer.max_subscribers) {
        return jsonResponse(req, { error: 'This Premium offer is sold out. Please refresh and choose the next available offer.' }, 409)
      }

      if (activeYearlyOffer.code === 'founders_yearly') priceId = FOUNDERS_YEARLY_PRICE_ID
      else if (activeYearlyOffer.code === 'early_yearly') priceId = EARLY_YEARLY_PRICE_ID
      else if (activeYearlyOffer.code === 'standard_yearly') priceId = STANDARD_YEARLY_PRICE_ID
      else throw new Error('Unknown yearly Premium offer')
    } else {
      return jsonResponse(req, { error: 'Invalid Premium plan' }, 400)
    }

    const origin = getCheckoutOrigin(req)
    const formData = new URLSearchParams()
    formData.append('mode', 'subscription')
    formData.append('line_items[0][price]', priceId)
    formData.append('line_items[0][quantity]', '1')
    formData.append('success_url', `${origin}/premium.html?checkout=success`)
    formData.append('cancel_url', `${origin}/premium.html?checkout=cancelled`)
    formData.append('client_reference_id', user.id)
    formData.append('subscription_data[metadata][supabase_user_id]', user.id)
    if (user.email) formData.append('customer_email', user.email)

    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    })

    const stripeData = await stripeResponse.json()
    if (!stripeResponse.ok) {
      console.error('STRIPE CHECKOUT ERROR', stripeResponse.status)
      throw new Error('Stripe Checkout failed')
    }
    if (typeof stripeData?.url !== 'string') throw new Error('Stripe Checkout returned no URL')

    return jsonResponse(req, { url: stripeData.url })
  } catch (error) {
    console.error('CHECKOUT ERROR:', error)
    return jsonResponse(req, { error: 'Premium checkout failed. Please try again later.' }, 500)
  }
})
