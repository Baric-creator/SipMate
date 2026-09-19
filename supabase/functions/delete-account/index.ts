import { createClient } from 'npm:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@18.5.0'

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

Deno.serve(async (req) => {
  const headers = corsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers })

  const origin = req.headers.get('origin')
  if (origin && !allowedOrigins.has(origin)) {
    return new Response('Origin not allowed', { status: 403, headers })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response('Unauthorized', { status: 401, headers })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error('DELETE ACCOUNT FUNCTION CONFIGURATION ERROR')
      return new Response('Account deletion is temporarily unavailable.', { status: 503, headers })
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    })

    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) return new Response('Unauthorized', { status: 401, headers })

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
    const uid = user.id

    const { data: subscriptions, error: subscriptionError } = await admin
      .from('premium_subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', uid)
    if (subscriptionError) throw subscriptionError

    const stripeIds = (subscriptions ?? [])
      .map((row) => row.stripe_subscription_id as string | null)
      .filter((id): id is string => Boolean(id))

    if (stripeIds.length) {
      if (!stripeSecretKey) {
        console.error('DELETE ACCOUNT STRIPE CONFIGURATION ERROR')
        return new Response('Account deletion is temporarily unavailable.', { status: 503, headers })
      }

      const stripe = new Stripe(stripeSecretKey)
      for (const subscriptionId of stripeIds) {
        try {
          await stripe.subscriptions.cancel(subscriptionId)
        } catch (error) {
          const code = (error as { code?: string })?.code
          if (code !== 'resource_missing') throw error
        }
      }
    }

    const { data: conversations, error: conversationLookupError } = await admin
      .from('conversations')
      .select('id')
      .or(`user_one.eq.${uid},user_two.eq.${uid}`)
    if (conversationLookupError) throw conversationLookupError

    const conversationIds = (conversations ?? []).map((row) => row.id as string)
    if (conversationIds.length) {
      const { data: imageMessages, error: imageLookupError } = await admin
        .from('messages')
        .select('image_path')
        .in('conversation_id', conversationIds)
        .eq('message_type', 'image')
        .not('image_path', 'is', null)
      if (imageLookupError) throw imageLookupError

      const imagePaths = [...new Set((imageMessages ?? []).map((row) => row.image_path as string | null).filter((path): path is string => Boolean(path)))]
      if (imagePaths.length) {
        const { error: imageCleanupError } = await admin.storage.from('chat-images').remove(imagePaths)
        if (imageCleanupError) throw imageCleanupError
      }

      const { error } = await admin.from('messages').delete().in('conversation_id', conversationIds)
      if (error) throw error
    }

    const avatarBucket = admin.storage.from('avatars')
    const [rootList, galleryList] = await Promise.all([
      avatarBucket.list(uid, { limit: 1000 }),
      avatarBucket.list(`${uid}/gallery`, { limit: 1000 }),
    ])
    if (rootList.error) throw rootList.error
    if (galleryList.error) throw galleryList.error

    const rootPaths = (rootList.data ?? [])
      .filter((object) => object.name !== 'gallery')
      .map((object) => `${uid}/${object.name}`)
    const galleryPaths = (galleryList.data ?? [])
      .map((object) => `${uid}/gallery/${object.name}`)
    const storagePaths = [...rootPaths, ...galleryPaths]

    if (storagePaths.length) {
      const { error } = await avatarBucket.remove(storagePaths)
      if (error) throw error
    }

    const operations = [
      admin.from('device_push_tokens').delete().eq('user_id', uid),
      admin.from('premium_subscriptions').delete().eq('user_id', uid),
      admin.from('reports').delete().or(`reporter_id.eq.${uid},reported_id.eq.${uid}`),
      admin.from('blocks').delete().or(`blocker_id.eq.${uid},blocked_id.eq.${uid}`),
      admin.from('skipped_profiles').delete().or(`user_id.eq.${uid},skipped_user_id.eq.${uid}`),
      admin.from('cheers').delete().or(`sender_id.eq.${uid},receiver_id.eq.${uid}`),
      admin.from('discord_oauth_states').delete().eq('user_id', uid),
      admin.from('discord_cheers_announcements').delete().or(`user_a.eq.${uid},user_b.eq.${uid}`),
      admin.from('user_action_rate_limits').delete().eq('user_id', uid),
      admin.from('profile_photos').delete().eq('user_id', uid),
    ]

    const results = await Promise.all(operations)
    const dbError = results.find((result) => result.error)?.error
    if (dbError) throw dbError

    const { error: conversationDeleteError } = await admin
      .from('conversations')
      .delete()
      .or(`user_one.eq.${uid},user_two.eq.${uid}`)
    if (conversationDeleteError) throw conversationDeleteError

    const { error: profileDeleteError } = await admin.from('profiles').delete().eq('id', uid)
    if (profileDeleteError) throw profileDeleteError

    const { error: deleteError } = await admin.auth.admin.deleteUser(uid)
    if (deleteError) throw deleteError

    return Response.json({ deleted: true }, { headers })
  } catch (error) {
    console.error('DELETE ACCOUNT FUNCTION ERROR:', error)
    return new Response('Account deletion failed. Please try again later.', { status: 500, headers })
  }
})
