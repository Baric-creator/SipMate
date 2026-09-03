import { createClient } from 'npm:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@^22'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

function getPortalOrigin(req: Request) {
  const requestOrigin = req.headers.get('origin')
  const configuredOrigin = Deno.env.get('APP_WEB_URL')

  for (const candidate of [requestOrigin, configuredOrigin]) {
    if (!candidate) continue
    try {
      const parsed = new URL(candidate)
      if (parsed.protocol === 'https:' || parsed.hostname === 'localhost') {
        return parsed.origin
      }
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error('Portal return URL is not configured')
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
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey || !stripeSecretKey) {
      console.error('CUSTOMER PORTAL FUNCTION CONFIGURATION ERROR')
      return jsonResponse({ error: 'Subscription management is temporarily unavailable.' }, 503)
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    })

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser()

    if (userError || !user) {
      return jsonResponse({ error: 'Invalid user session' }, 401)
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })

    const { data: subscription, error: subscriptionError } = await supabaseAdmin
      .from('premium_subscriptions')
      .select('stripe_customer_id, stripe_subscription_id, status')
      .eq('user_id', user.id)
      .not('stripe_customer_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (subscriptionError) throw subscriptionError
    if (!subscription?.stripe_customer_id) {
      return jsonResponse({ error: 'Stripe customer not found' }, 404)
    }

    const stripe = new Stripe(stripeSecretKey)
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${getPortalOrigin(req)}/premium`,
    })

    return jsonResponse({ url: portalSession.url })
  } catch (error) {
    console.error('CUSTOMER PORTAL ERROR:', error)
    return jsonResponse(
      { error: 'Subscription management failed. Please try again later.' },
      500
    )
  }
})
