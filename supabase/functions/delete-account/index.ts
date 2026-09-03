import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')

    if (!authHeader) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    })

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser()

    if (userError || !user) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    // Release safety gate: do not delete the auth identity until database rows,
    // storage objects and paid-subscription cleanup have been verified end to end.
    if (Deno.env.get('ACCOUNT_DELETION_ENABLED') !== 'true') {
      return new Response(
        'Account deletion is temporarily unavailable while deletion cleanup is being finalized.',
        { status: 503, headers: corsHeaders }
      )
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)

    if (deleteError) throw deleteError

    return Response.json({ deleted: true }, { headers: corsHeaders })
  } catch (error) {
    console.error('DELETE ACCOUNT FUNCTION ERROR:', error)
    return new Response(
      error instanceof Error ? error.message : 'Account deletion failed',
      { status: 500, headers: corsHeaders }
    )
  }
})
