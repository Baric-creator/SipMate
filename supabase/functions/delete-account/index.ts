import { createClient } from 'npm:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@18.5.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error('DELETE ACCOUNT FUNCTION CONFIGURATION ERROR')
      return new Response('Account deletion is temporarily unavailable.', { status: 503, headers: corsHeaders })
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    })
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

    if (Deno.env.get('ACCOUNT_DELETION_ENABLED') !== 'true') {
      return new Response('Account deletion is temporarily unavailable while deletion cleanup is being finalized.', { status: 503, headers: corsHeaders })
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
    const uid = user.id

    // Paid access must be stopped before any local subscription record is removed.
    const { data: subscriptions, error: subscriptionError } = await admin
      .from('premium_subscriptions')
      .select('stripe_subscription_id,status')
      .eq('user_id', uid)
    if (subscriptionError) throw subscriptionError

    const stripeIds = (subscriptions ?? [])
      .map((row) => row.stripe_subscription_id as string | null)
      .filter((id): id is string => Boolean(id))

    if (stripeIds.length) {
      if (!stripeSecretKey) {
        console.error('DELETE ACCOUNT STRIPE CONFIGURATION ERROR')
        return new Response('Account deletion is temporarily unavailable.', { status: 503, headers: corsHeaders })
      }
      const stripe = new Stripe(stripeSecretKey)
      for (const subscriptionId of stripeIds) {
        try {
          await stripe.subscriptions.cancel(subscriptionId)
        } catch (error) {
          const code = (error as { code?: string })?.code
          if (code !== 'resource_missing') throw error
          console.warn('Stripe subscription already missing during account deletion:', subscriptionId)
        }
      }
    }

    const { data: objects, error: listError } = await admin.storage.from('avatars').list(uid, { limit: 1000 })
    if (listError) throw listError
    const paths = (objects ?? []).map((object) => `${uid}/${object.name}`)
    if (paths.length) {
      const { error: storageError } = await admin.storage.from('avatars').remove(paths)
      if (storageError) throw storageError
    }

    const operations = [
      admin.from('premium_subscriptions').delete().eq('user_id', uid),
      admin.from('reports').delete().or(`reporter_id.eq.${uid},reported_id.eq.${uid}`),
      admin.from('blocks').delete().or(`blocker_id.eq.${uid},blocked_id.eq.${uid}`),
      admin.from('skipped_profiles').delete().or(`user_id.eq.${uid},skipped_user_id.eq.${uid}`),
      admin.from('cheers').delete().or(`sender_id.eq.${uid},receiver_id.eq.${uid}`),
      admin.from('conversations').delete().or(`user_one.eq.${uid},user_two.eq.${uid}`),
      admin.from('profile_photos').delete().eq('user_id', uid),
      admin.from('profiles').delete().eq('id', uid),
    ]
    const results = await Promise.all(operations)
    const dbError = results.find((result) => result.error)?.error
    if (dbError) throw dbError

    const { error: deleteError } = await admin.auth.admin.deleteUser(uid)
    if (deleteError) throw deleteError

    return Response.json({ deleted: true }, { headers: corsHeaders })
  } catch (error) {
    console.error('DELETE ACCOUNT FUNCTION ERROR:', error)
    return new Response('Account deletion failed. Please try again later.', { status: 500, headers: corsHeaders })
  }
})
