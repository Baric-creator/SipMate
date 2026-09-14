import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const headers = { "Content-Type": "application/json" };
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers });

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRole) {
      return new Response(JSON.stringify({ error: "supabase_not_configured" }), { status: 500, headers });
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: userData, error: userError } = await callerClient.auth.getUser(token);
    const user = userData?.user;
    if (userError || !user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers });

    const body = await req.json();
    const pushToken = String(body?.token ?? "").trim();
    const platform = body?.platform === "ios" ? "ios" : body?.platform === "android" ? "android" : null;
    if (!platform || !/^(Expo|Exponent)PushToken\[[^\]]+\]$/.test(pushToken)) {
      return new Response(JSON.stringify({ error: "invalid_push_token" }), { status: 400, headers });
    }

    const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
    await admin.from("device_push_tokens").delete().eq("token", pushToken);
    const { error: insertError } = await admin.from("device_push_tokens").insert({
      token: pushToken,
      user_id: user.id,
      platform,
      updated_at: new Date().toISOString(),
    });
    if (insertError) {
      console.error("PUSH TOKEN STORE ERROR", insertError);
      return new Response(JSON.stringify({ error: "store_failed" }), { status: 500, headers });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  } catch (error) {
    console.error("REGISTER PUSH TOKEN ERROR", error);
    return new Response(JSON.stringify({ error: "server_error" }), { status: 500, headers });
  }
});