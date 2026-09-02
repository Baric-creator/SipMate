import { createClient } from 'npm:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@^22'

const stripe = new Stripe(
  Deno.env.get('STRIPE_SECRET_KEY')!
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Browser CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    })
  }

  try {
    const { accessToken } =
      await req.json()

    if (!accessToken) {
      throw new Error(
        'Missing access token'
      )
    }

    const supabaseUrl =
      Deno.env.get('SUPABASE_URL')!

    const supabaseAnonKey =
      Deno.env.get('SUPABASE_ANON_KEY')!

    const supabaseAdmin =
      createClient(
        supabaseUrl,
        Deno.env.get(
          'SUPABASE_SERVICE_ROLE_KEY'
        )!
      )

    const supabaseUserClient =
      createClient(
        supabaseUrl,
        supabaseAnonKey
      )

    const {
      data: { user },
      error: userError,
    } =
      await supabaseUserClient
        .auth
        .getUser(accessToken)

    if (userError || !user) {
      throw new Error(
        'User not authenticated'
      )
    }

    const {
      data: subscription,
      error: subscriptionError,
    } =
      await supabaseAdmin
        .from('premium_subscriptions')
        .select(
          'stripe_customer_id, stripe_subscription_id, status'
        )
        .eq('user_id', user.id)
        .not(
          'stripe_customer_id',
          'is',
          null
        )
        .order('created_at', {
          ascending: false,
        })
        .limit(1)
        .maybeSingle()

    if (subscriptionError) {
      throw subscriptionError
    }

    if (
      !subscription?.stripe_customer_id
    ) {
      throw new Error(
        'Stripe customer not found'
      )
    }

    const origin =
      req.headers.get('origin') ||
      'http://localhost:8082'

    const portalSession =
      await stripe.billingPortal
        .sessions
        .create({
          customer:
            subscription
              .stripe_customer_id,

          return_url:
            `${origin}/premium`,
        })

    return Response.json(
      {
        url: portalSession.url,
      },
      {
        headers: corsHeaders,
      }
    )
  } catch (error) {
    console.log(
      'CUSTOMER PORTAL ERROR:',
      error
    )

    return new Response(
      error instanceof Error
        ? error.message
        : 'Unknown error',
      {
        status: 400,
        headers: corsHeaders,
      }
    )
  }
})