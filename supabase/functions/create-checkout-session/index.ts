import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MONTHLY_PRICE_ID = 'price_1UAAwKF9keqz65yeAB2gM6y1'
const FOUNDERS_YEARLY_PRICE_ID = 'price_1UAB3YF9keqz65yetpOin6EL'
const EARLY_YEARLY_PRICE_ID = 'price_1UAYX3F9keqz65ye433hIOYb'
const STANDARD_YEARLY_PRICE_ID = 'price_1UAYYNF9keqz65yeaT62ebxl'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

function getCheckoutOrigin(req: Request) {
  const requestOrigin = req.headers.get('origin')
  const configuredOrigin = Deno.env.get('APP_WEB_URL')

  if (requestOrigin) {
    try {
      const parsed = new URL(requestOrigin)
      if (parsed.protocol === 'https:' || parsed.hostname === 'localhost') {
        return parsed.origin
      }
    } catch {
      // Fall through to the configured production URL.
    }
  }

  if (configuredOrigin) {
    try {
      const parsed = new URL(configuredOrigin)
      if (parsed.protocol === 'https:' || parsed.hostname === 'localhost') {
        return parsed.origin
      }
    } catch {
      // Configuration error is handled below.
    }
  }

  throw new Error('Checkout return URL is not configured')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonResponse({ error: 'Not authenticated' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')

    if (!supabaseUrl || !supabaseAnonKey || !stripeSecretKey) {
      console.error('CHECKOUT FUNCTION CONFIGURATION ERROR')
      return jsonResponse({ error: 'Premium checkout is temporarily unavailable.' }, 503)
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    })

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return jsonResponse({ error: 'Invalid user session' }, 401)
    }

    const { data: activeSubscription, error: subscriptionError } = await supabase
      .from('premium_subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()

    if (subscriptionError) {
      console.error('PREMIUM CHECK ERROR:', subscriptionError)
      throw new Error('Could not verify Premium status')
    }

    if (activeSubscription) {
      return jsonResponse(
        { error: 'You already have an active Premium subscription.' },
        409
      )
    }

    let body: { plan?: unknown }
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ error: 'Invalid request body' }, 400)
    }

    const plan = body.plan
    let priceId: string

    if (plan === 'monthly') {
      priceId = MONTHLY_PRICE_ID
    } else if (plan === 'yearly') {
      const { data: activeYearlyOffer, error: offerError } = await supabase
        .from('premium_offers')
        .select('code')
        .eq('billing_period', 'yearly')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (offerError) {
        console.error('ACTIVE OFFER ERROR:', offerError)
        throw new Error('Could not load active yearly offer')
      }

      if (!activeYearlyOffer) throw new Error('No active yearly Premium offer')

      if (activeYearlyOffer.code === 'founders_yearly') {
        priceId = FOUNDERS_YEARLY_PRICE_ID
      } else if (activeYearlyOffer.code === 'early_yearly') {
        priceId = EARLY_YEARLY_PRICE_ID
      } else if (activeYearlyOffer.code === 'standard_yearly') {
        priceId = STANDARD_YEARLY_PRICE_ID
      } else {
        throw new Error('Unknown yearly Premium offer')
      }
    } else {
      return jsonResponse({ error: 'Invalid Premium plan' }, 400)
    }

    const origin = getCheckoutOrigin(req)
    const formData = new URLSearchParams()
    formData.append('mode', 'subscription')
    formData.append('line_items[0][price]', priceId)
    formData.append('line_items[0][quantity]', '1')
    formData.append('success_url', `${origin}/premium?checkout=success`)
    formData.append('cancel_url', `${origin}/premium?checkout=cancelled`)
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

    if (typeof stripeData?.url !== 'string') {
      throw new Error('Stripe Checkout returned no URL')
    }

    return jsonResponse({ url: stripeData.url })
  } catch (error) {
    console.error('CHECKOUT ERROR:', error)
    return jsonResponse({ error: 'Premium checkout failed. Please try again later.' }, 500)
  }
})
