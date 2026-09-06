import { createClient } from 'npm:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@^22'

const stripe = new Stripe(
  Deno.env.get('STRIPE_SECRET_KEY')!
)

const cryptoProvider =
  Stripe.createSubtleCryptoProvider()

const MONTHLY_PRICE_ID =
  'price_1UAAwKF9keqz65yeAB2gM6y1'

const FOUNDERS_YEARLY_PRICE_ID =
  'price_1UAB3YF9keqz65yetpOin6EL'

const EARLY_YEARLY_PRICE_ID =
  'price_1UAYX3F9keqz65ye433hIOYb'

const STANDARD_YEARLY_PRICE_ID =
  'price_1UAYYNF9keqz65yeaT62ebxl'

function getOfferCode(
  priceId: string
) {
  if (
    priceId === MONTHLY_PRICE_ID
  ) {
    return 'monthly'
  }

  if (
    priceId ===
    FOUNDERS_YEARLY_PRICE_ID
  ) {
    return 'founders_yearly'
  }

  if (
    priceId ===
    EARLY_YEARLY_PRICE_ID
  ) {
    return 'early_yearly'
  }

  if (
    priceId ===
    STANDARD_YEARLY_PRICE_ID
  ) {
    return 'standard_yearly'
  }

  throw new Error(
    `Unknown Stripe price: ${priceId}`
  )
}

async function verifyStripeEvent(
  body: string,
  signature: string
) {
  const checkoutSecret =
    Deno.env.get(
      'STRIPE_WEBHOOK_SECRET'
    )

  const subscriptionSecret =
    Deno.env.get(
      'STRIPE_SUBSCRIPTION_WEBHOOK_SECRET'
    )

  const secrets = [
    checkoutSecret,
    subscriptionSecret,
  ].filter(Boolean) as string[]

  for (const secret of secrets) {
    try {
      return await stripe.webhooks
        .constructEventAsync(
          body,
          signature,
          secret,
          undefined,
          cryptoProvider
        )
    } catch {
      // Probaj sljedeći signing secret
    }
  }

  throw new Error(
    'Invalid Stripe webhook signature'
  )
}

Deno.serve(async (req) => {
  try {
    const signature =
      req.headers.get(
        'stripe-signature'
      )

    if (!signature) {
      return new Response(
        'Missing Stripe signature',
        {
          status: 400,
        }
      )
    }

    const body =
      await req.text()

    let event: Stripe.Event

    try {
      event =
        await verifyStripeEvent(
          body,
          signature
        )
    } catch (error) {
      console.log(
        'WEBHOOK SIGNATURE ERROR:',
        error
      )

      return new Response(
        'Invalid Stripe signature',
        {
          status: 400,
        }
      )
    }

    console.log(
      'STRIPE EVENT:',
      event.type
    )

    const supabaseAdmin =
      createClient(
        Deno.env.get(
          'SUPABASE_URL'
        )!,
        Deno.env.get(
          'SUPABASE_SERVICE_ROLE_KEY'
        )!
      )

    async function syncDiscordPremiumRole(
      subscription: Stripe.Subscription,
      forceActive?: boolean
    ) {
      const userId =
        subscription.metadata
          ?.supabase_user_id

      const botToken =
        Deno.env.get(
          'DISCORD_BOT_TOKEN'
        )

      const guildId =
        Deno.env.get(
          'DISCORD_GUILD_ID'
        ) ||
        '1545876541387440188'

      const premiumRoleId =
        Deno.env.get(
          'DISCORD_PREMIUM_ROLE_ID'
        ) ||
        '1546177699662405786'

      if (!userId || !botToken) {
        console.log(
          'DISCORD ROLE SYNC SKIPPED:',
          !userId
            ? 'missing user id'
            : 'missing bot token'
        )
        return
      }

      const {
        data: profile,
        error: profileError,
      } =
        await supabaseAdmin
          .from('profiles')
          .select(
            'discord_user_id'
          )
          .eq('id', userId)
          .maybeSingle()

      if (profileError) {
        console.log(
          'DISCORD PROFILE LOOKUP ERROR:',
          profileError
        )
        return
      }

      const discordUserId =
        profile?.discord_user_id

      if (!discordUserId) {
        console.log(
          'DISCORD ROLE SYNC SKIPPED: user not linked',
          userId
        )
        return
      }

      const active =
        forceActive ??
        (
          subscription.status ===
            'active' ||
          subscription.status ===
            'trialing'
        )

      const method =
        active ? 'PUT' : 'DELETE'

      const roleResponse =
        await fetch(
          `https://discord.com/api/v10/guilds/${guildId}/members/${discordUserId}/roles/${premiumRoleId}`,
          {
            method,
            headers: {
              Authorization:
                `Bot ${botToken}`,
            },
          }
        )

      if (
        roleResponse.status !== 204
      ) {
        console.log(
          'DISCORD ROLE UPDATE ERROR:',
          roleResponse.status,
          await roleResponse.text()
        )
        return
      }

      console.log(
        active
          ? 'DISCORD PREMIUM ROLE ADDED'
          : 'DISCORD PREMIUM ROLE REMOVED',
        discordUserId
      )
    }

    async function syncSubscription(
      subscription:
        Stripe.Subscription,
      forceStatus?: string
    ) {
      const userId =
        subscription.metadata
          ?.supabase_user_id

      if (!userId) {
        throw new Error(
          'Missing supabase_user_id in Stripe subscription metadata'
        )
      }

      const item =
        subscription.items.data[0]

      if (!item) {
        throw new Error(
          'Stripe subscription item missing'
        )
      }

      const priceId =
        item.price.id

      const offerCode =
        getOfferCode(priceId)

      const startedAt =
        new Date(
          item.current_period_start *
            1000
        ).toISOString()

      const expiresAt =
        new Date(
          item.current_period_end *
            1000
        ).toISOString()

const cancelAtPeriodEnd =
  subscription.cancel_at_period_end ===
    true ||
  subscription.cancel_at != null

      let status = forceStatus

      if (!status) {
        if (
          subscription.status ===
            'active' ||
          subscription.status ===
            'trialing'
        ) {
          status = 'active'
        } else {
          status =
            subscription.status
        }
      }

      const customerId =
        typeof subscription.customer ===
        'string'
          ? subscription.customer
          : subscription.customer?.id ??
            null

      const subscriptionId =
        subscription.id

      const {
        data: existingStripeRow,
        error: existingStripeError,
      } =
        await supabaseAdmin
          .from(
            'premium_subscriptions'
          )
          .select('id')
          .eq(
            'stripe_subscription_id',
            subscriptionId
          )
          .maybeSingle()

      if (existingStripeError) {
        throw existingStripeError
      }

      if (existingStripeRow) {
        const { error } =
          await supabaseAdmin
            .from(
              'premium_subscriptions'
            )
            .update({
              offer_code:
                offerCode,
              status,
              started_at:
                startedAt,
              expires_at:
                expiresAt,
              stripe_customer_id:
                customerId,
              stripe_price_id:
                priceId,
              cancel_at_period_end:
                cancelAtPeriodEnd,
            })
            .eq(
              'id',
              existingStripeRow.id
            )

        if (error) {
          throw error
        }

        console.log(
          'PREMIUM UPDATED:',
          userId,
          status,
          offerCode,
          'cancel_at_period_end:',
          cancelAtPeriodEnd
        )

        return
      }

      const {
        data: oldRow,
        error: oldRowError,
      } =
        await supabaseAdmin
          .from(
            'premium_subscriptions'
          )
          .select('id')
          .eq(
            'user_id',
            userId
          )
          .is(
            'stripe_subscription_id',
            null
          )
          .order(
            'created_at',
            {
              ascending: false,
            }
          )
          .limit(1)
          .maybeSingle()

      if (oldRowError) {
        throw oldRowError
      }

      if (oldRow) {
        const { error } =
          await supabaseAdmin
            .from(
              'premium_subscriptions'
            )
            .update({
              offer_code:
                offerCode,
              status,
              started_at:
                startedAt,
              expires_at:
                expiresAt,
              stripe_subscription_id:
                subscriptionId,
              stripe_customer_id:
                customerId,
              stripe_price_id:
                priceId,
              cancel_at_period_end:
                cancelAtPeriodEnd,
            })
            .eq(
              'id',
              oldRow.id
            )

        if (error) {
          throw error
        }

        console.log(
          'PREMIUM LINKED:',
          userId,
          subscriptionId
        )

        return
      }

      const {
        error: insertError,
      } =
        await supabaseAdmin
          .from(
            'premium_subscriptions'
          )
          .insert({
            user_id:
              userId,
            offer_code:
              offerCode,
            status,
            started_at:
              startedAt,
            expires_at:
              expiresAt,
            stripe_subscription_id:
              subscriptionId,
            stripe_customer_id:
              customerId,
            stripe_price_id:
              priceId,
            cancel_at_period_end:
              cancelAtPeriodEnd,
          })

      if (
        insertError?.code ===
        '23505'
      ) {
        const {
          error: updateError,
        } =
          await supabaseAdmin
            .from(
              'premium_subscriptions'
            )
            .update({
              offer_code:
                offerCode,
              status,
              started_at:
                startedAt,
              expires_at:
                expiresAt,
              stripe_customer_id:
                customerId,
              stripe_price_id:
                priceId,
              cancel_at_period_end:
                cancelAtPeriodEnd,
            })
            .eq(
              'stripe_subscription_id',
              subscriptionId
            )

        if (updateError) {
          throw updateError
        }

        console.log(
          'PREMIUM ALREADY EXISTS - UPDATED:',
          userId,
          subscriptionId
        )

        return
      }

      if (insertError) {
        throw insertError
      }

      console.log(
        'PREMIUM CREATED:',
        userId,
        offerCode
      )
    }

    // =========================
    // NEW CHECKOUT
    // =========================

    if (
      event.type ===
      'checkout.session.completed'
    ) {
      const session =
        event.data.object as
          Stripe.Checkout.Session

      if (
        !session.subscription
      ) {
        throw new Error(
          'Checkout has no subscription'
        )
      }

      const subscriptionId =
        typeof session.subscription ===
        'string'
          ? session.subscription
          : session.subscription.id

      const subscription =
        await stripe.subscriptions
          .retrieve(
            subscriptionId
          )

      await syncSubscription(
        subscription
      )

      await syncDiscordPremiumRole(
        subscription
      )
    }

    // =========================
    // SUBSCRIPTION UPDATED
    // =========================

    if (
      event.type ===
      'customer.subscription.updated'
    ) {
      const subscription =
        event.data.object as
          Stripe.Subscription

      await syncSubscription(
        subscription
      )

      await syncDiscordPremiumRole(
        subscription
      )
    }

    // =========================
    // SUBSCRIPTION CANCELLED
    // =========================

    if (
      event.type ===
      'customer.subscription.deleted'
    ) {
      const subscription =
        event.data.object as
          Stripe.Subscription

      await syncSubscription(
        subscription,
        'cancelled'
      )

      await syncDiscordPremiumRole(
        subscription,
        false
      )
    }

    // =========================
    // SUCCESSFUL RENEWAL
    // =========================

    if (
      event.type ===
      'invoice.payment_succeeded'
    ) {
      const invoice =
        event.data.object as any

      const subscriptionId =
        typeof invoice.subscription ===
        'string'
          ? invoice.subscription
          : invoice.subscription?.id ??
            invoice.parent
              ?.subscription_details
              ?.subscription

      if (subscriptionId) {
        const id =
          typeof subscriptionId ===
          'string'
            ? subscriptionId
            : subscriptionId.id

        const subscription =
          await stripe.subscriptions
            .retrieve(id)

        await syncSubscription(
          subscription
        )

        await syncDiscordPremiumRole(
          subscription
        )
      }
    }

    return Response.json({
      received: true,
    })
  } catch (error) {
    console.log(
      'WEBHOOK ERROR:',
      error
    )

    return new Response(
      error instanceof Error
        ? error.message
        : 'Unknown error',
      {
        status: 400,
      }
    )
  }
})