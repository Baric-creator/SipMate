import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_PUSH_TOKENS_PER_USER = 10;
const PUSH_TIMEOUT_MS = 8_000;

Deno.serve(async (req) => {
  const headers = { "Content-Type": "application/json" };
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers });
  }

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
    const caller = userData?.user;
    if (userError || !caller) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers });
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400, headers });
    }
    const messageId = String(body?.messageId ?? "");
    if (!UUID_PATTERN.test(messageId)) return new Response(JSON.stringify({ error: "invalid_message_id" }), { status: 400, headers });

    const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

    const { data: message, error: messageError } = await admin
      .from("messages")
      .select("id, conversation_id, sender_id, content, read_at")
      .eq("id", messageId)
      .single();
    if (messageError || !message) return new Response(JSON.stringify({ error: "message_not_found" }), { status: 404, headers });
    if (message.sender_id !== caller.id) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers });

    if (message.read_at) return new Response(JSON.stringify({ ok: true, skipped: "already_read" }), { status: 200, headers });

    const { data: conversation } = await admin
      .from("conversations")
      .select("id, user_one, user_two")
      .eq("id", message.conversation_id)
      .single();
    if (!conversation) return new Response(JSON.stringify({ error: "conversation_not_found" }), { status: 404, headers });

    const recipientId = conversation.user_one === caller.id ? conversation.user_two :
      conversation.user_two === caller.id ? conversation.user_one : null;
    if (!recipientId) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers });

    const { data: blocked } = await admin.rpc("is_blocked_between", { user_a: caller.id, user_b: recipientId });
    if (blocked) return new Response(JSON.stringify({ ok: true, skipped: "blocked" }), { status: 200, headers });

    const [{ data: senderProfile }, { data: pushTokens }] = await Promise.all([
      admin.from("profiles").select("name").eq("id", caller.id).maybeSingle(),
      admin
        .from("device_push_tokens")
        .select("token")
        .eq("user_id", recipientId)
        .order("updated_at", { ascending: false })
        .limit(MAX_PUSH_TOKENS_PER_USER),
    ]);

    const tokens = (pushTokens ?? []).map((row: any) => row.token).filter((v: unknown) => typeof v === "string");
    if (!tokens.length) return new Response(JSON.stringify({ ok: true, skipped: "no_push_token" }), { status: 200, headers });

    const senderName = senderProfile?.name || "SipMate";
    const content = String(message.content || "").slice(0, 180);
    const payload = tokens.map((pushToken: string) => ({
      to: pushToken,
      sound: "default",
      channelId: "messages",
      title: `${senderName} 🍻`,
      body: content,
      data: {
        type: "message",
        conversationId: message.conversation_id,
      },
      priority: "high",
    }));

    const pushResponse = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(PUSH_TIMEOUT_MS),
    });

    const result = await pushResponse.json().catch(() => ({}));
    const tickets = Array.isArray(result?.data) ? result.data : [];
    const staleTokens = tickets
      .map((ticket: any, index: number) =>
        ticket?.status === "error" && ticket?.details?.error === "DeviceNotRegistered"
          ? tokens[index]
          : null
      )
      .filter((value: string | null): value is string => Boolean(value));
    if (staleTokens.length) {
      const { error: cleanupError } = await admin
        .from("device_push_tokens")
        .delete()
        .eq("user_id", recipientId)
        .in("token", staleTokens);
      if (cleanupError) console.error("STALE PUSH TOKEN CLEANUP ERROR", cleanupError);
    }
    if (!pushResponse.ok) {
      console.error("EXPO PUSH ERROR", pushResponse.status, result);
      return new Response(JSON.stringify({ error: "push_failed" }), { status: 502, headers });
    }

    return new Response(JSON.stringify({ ok: true, result }), { status: 200, headers });
  } catch (error) {
    console.error("MESSAGE NOTIFICATION ERROR", error);
    return new Response(JSON.stringify({ error: "server_error" }), { status: 500, headers });
  }
});