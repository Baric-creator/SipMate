import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const MONTHLY_PRICE_ID =
  'price_1UAAwKF9keqz65yeAB2gM6y1'

const FOUNDERS_YEARLY_PRICE_ID =
  'price_1UAB3YF9keqz65yetpOin6EL'

const EARLY_YEARLY_PRICE_ID =
  'price_1UAYX3F9keqz65ye433hIOYb'

const STANDARD_YEARLY_PRICE_ID =
  'price_1UAYYNF9keqz65yeaT62ebxl'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    })
  }

  try {
    const authHeader =
      req.headers.get('Authorization')

    if (!authHeader) {
      return new Response(
        JSON.stringify({
          error: 'Not authenticated',
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type':
              'application/json',
          },
        }
      )
    }

    const supabaseUrl =
      Deno.env.get('SUPABASE_URL')!

    const supabaseAnonKey =
      Deno.env.get(
        'SUPABASE_ANON_KEY'
      )!

    const stripeSecretKey =
      Deno.env.get(
        'STRIPE_SECRET_KEY'
      )

    if (!stripeSecretKey) {
      throw new Error(
        'STRIPE_SECRET_KEY is missing'
      )
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: {
            Authorization:
              authHeader,
          },
        },
      }
    )

    const {
      data: { user },
      error: userError,
    } =
      await supabase.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({
          error:
            'Invalid user session',
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type':
              'application/json',
          },
        }
      )
    }
const {
  data: activeSubscription,
  error: subscriptionError,
} = await supabase
  .from('premium_subscriptions')
  .select('id')
  .eq('user_id', user.id)
  .eq('status', 'active')
  .limit(1)
  .maybeSingle()

if (subscriptionError) {
  console.log(
    'PREMIUM CHECK ERROR:',
    subscriptionError
  )

  throw new Error(
    'Could not verify Premium status'
  )
}

if (activeSubscription) {
  return new Response(
    JSON.stringify({
      error:
        'You already have an active Premium subscription.',
    }),
    {
      status: 409,
      headers: {
        ...corsHeaders,
        'Content-Type':
          'application/json',
      },
    }
  )
}
    const { plan } =
      await req.json()

    let priceId: string

    if (plan === 'monthly') {
      priceId =
        MONTHLY_PRICE_ID
    } else if (plan === 'yearly') {
      const {
        data: activeYearlyOffer,
        error: offerError,
      } =
        await supabase
          .from('premium_offers')
          .select('code')
          .eq(
            'billing_period',
            'yearly'
          )
          .eq('is_active', true)
          .order('sort_order', {
            ascending: true,
          })
          .limit(1)
          .maybeSingle()

      if (offerError) {
        console.log(
          'ACTIVE OFFER ERROR:',
          offerError
        )

        throw new Error(
          'Could not load active yearly offer'
        )
      }

      if (!activeYearlyOffer) {
        throw new Error(
          'No active yearly Premium offer'
        )
      }

      if (
        activeYearlyOffer.code ===
        'founders_yearly'
      ) {
        priceId =
          FOUNDERS_YEARLY_PRICE_ID
      } else if (
        activeYearlyOffer.code ===
        'early_yearly'
      ) {
        priceId =
          EARLY_YEARLY_PRICE_ID
      } else if (
        activeYearlyOffer.code ===
        'standard_yearly'
      ) {
        priceId =
          STANDARD_YEARLY_PRICE_ID
      } else {
        throw new Error(
          'Unknown yearly Premium offer'
        )
      }
    } else {
      return new Response(
        JSON.stringify({
          error:
            'Invalid Premium plan',
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type':
              'application/json',
          },
        }
      )
    }

    const origin =
      req.headers.get('origin') ??
      'http://localhost:8082'

    const formData =
      new URLSearchParams()

    formData.append(
      'mode',
      'subscription'
    )

    formData.append(
      'line_items[0][price]',
      priceId
    )

    formData.append(
      'line_items[0][quantity]',
      '1'
    )

    formData.append(
      'success_url',
      `${origin}/premium?checkout=success`
    )

    formData.append(
      'cancel_url',
      `${origin}/premium?checkout=cancelled`
    )

    formData.append(
      'client_reference_id',
      user.id
    )

    formData.append(
      'subscription_data[metadata][supabase_user_id]',
      user.id
    )

    if (user.email) {
      formData.append(
        'customer_email',
        user.email
      )
    }

    const stripeResponse =
      await fetch(
        'https://api.stripe.com/v1/checkout/sessions',
        {
          method: 'POST',
          headers: {
            Authorization:
              `Bearer ${stripeSecretKey}`,
            'Content-Type':
              'application/x-www-form-urlencoded',
          },
          body:
            formData.toString(),
        }
      )

    const stripeData =
      await stripeResponse.json()

    if (!stripeResponse.ok) {
      console.log(
        'STRIPE ERROR:',
        stripeData
      )

      throw new Error(
        stripeData?.error
          ?.message ??
          'Stripe Checkout failed'
      )
    }

    return new Response(
      JSON.stringify({
        url: stripeData.url,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type':
            'application/json',
        },
      }
    )
  } catch (error) {
    console.log(
      'CHECKOUT ERROR:',
      error
    )

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type':
            'application/json',
        },
      }
    )
  }
})