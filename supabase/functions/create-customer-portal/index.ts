import { createClient } from 'npm:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@^22'

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

function jsonResponse(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  })
}

function getPortalOrigin(req: Request) {
  const configuredOrigin = Deno.env.get('APP_WEB_URL')
  if (configuredOrigin) {
    try {
      const parsed = new URL(configuredOrigin)
      if (parsed.protocol === 'https:' || parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
        return parsed.origin
      }
    } catch {
      // Use safe production origin below.
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
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey || !stripeSecretKey) {
      console.error('CUSTOMER PORTAL FUNCTION CONFIGURATION ERROR')
      return jsonResponse(req, { error: 'Subscription management is temporarily unavailable.' }, 503)
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    })

    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) return jsonResponse(req, { error: 'Invalid user session' }, 401)

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
    const { data: subscription, error: subscriptionError } = await supabaseAdmin
      .from('premium_subscriptions')
      .select('stripe_customer_id, stripe_subscription_id, status')
      .eq('user_id', user.id)
      .not('stripe_customer_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (subscriptionError) throw subscriptionError
    if (!subscription?.stripe_customer_id) return jsonResponse(req, { error: 'Stripe customer not found' }, 404)

    const stripe = new Stripe(stripeSecretKey)
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${getPortalOrigin(req)}/premium.html`,
    })

    return jsonResponse(req, { url: portalSession.url })
  } catch (error) {
    console.error('CUSTOMER PORTAL ERROR:', error)
    return jsonResponse(req, { error: 'Subscription management failed. Please try again later.' }, 500)
  }
})
