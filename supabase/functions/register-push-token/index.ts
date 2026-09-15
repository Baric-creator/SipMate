import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const MAX_PUSH_TOKEN_LENGTH = 256;
const MAX_PUSH_TOKENS_PER_USER = 10;

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

    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400, headers });
    }

    const action = body?.action ?? "register";
    if (action !== "register" && action !== "unregister") {
      return new Response(JSON.stringify({ error: "invalid_action" }), { status: 400, headers });
    }

    const pushToken = String(body?.token ?? "").trim();
    if (
      pushToken.length === 0 ||
      pushToken.length > MAX_PUSH_TOKEN_LENGTH ||
      !/^(Expo|Exponent)PushToken\[[^\]]+\]$/.test(pushToken)
    ) {
      return new Response(JSON.stringify({ error: "invalid_push_token" }), { status: 400, headers });
    }

    const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

    if (action === "unregister") {
      const { error: deleteError } = await admin
        .from("device_push_tokens")
        .delete()
        .eq("user_id", user.id)
        .eq("token", pushToken);

      if (deleteError) {
        console.error("PUSH TOKEN DELETE ERROR", deleteError);
        return new Response(JSON.stringify({ error: "delete_failed" }), { status: 500, headers });
      }

      return new Response(JSON.stringify({ ok: true, unregistered: true }), { status: 200, headers });
    }

    const platform = body?.platform === "ios" ? "ios" : body?.platform === "android" ? "android" : null;
    if (!platform) {
      return new Response(JSON.stringify({ error: "invalid_platform" }), { status: 400, headers });
    }

    const { error: upsertError } = await admin.from("device_push_tokens").upsert({
      token: pushToken,
      user_id: user.id,
      platform,
      updated_at: new Date().toISOString(),
    }, { onConflict: "token" });
    if (upsertError) {
      console.error("PUSH TOKEN STORE ERROR", upsertError);
      return new Response(JSON.stringify({ error: "store_failed" }), { status: 500, headers });
    }

    const { data: excessTokens, error: excessError } = await admin
      .from("device_push_tokens")
      .select("token")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .range(MAX_PUSH_TOKENS_PER_USER, MAX_PUSH_TOKENS_PER_USER + 99);

    if (excessError) {
      console.error("PUSH TOKEN PRUNE LOOKUP ERROR", excessError);
    } else {
      const tokensToDelete = (excessTokens ?? [])
        .map((row: any) => row.token)
        .filter((value: unknown): value is string => typeof value === "string");
      if (tokensToDelete.length) {
        const { error: pruneError } = await admin
          .from("device_push_tokens")
          .delete()
          .eq("user_id", user.id)
          .in("token", tokensToDelete);
        if (pruneError) console.error("PUSH TOKEN PRUNE ERROR", pruneError);
      }
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  } catch (error) {
    console.error("REGISTER PUSH TOKEN ERROR", error);
    return new Response(JSON.stringify({ error: "server_error" }), { status: 500, headers });
  }
});
