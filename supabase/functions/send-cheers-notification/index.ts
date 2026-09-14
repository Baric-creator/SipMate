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
    if (!supabaseUrl || !anonKey || !serviceRole) return new Response(JSON.stringify({ error: "supabase_not_configured" }), { status: 500, headers });

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: userData, error: userError } = await callerClient.auth.getUser(token);
    const caller = userData?.user;
    if (userError || !caller) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers });

    const body = await req.json();
    const cheersId = String(body?.cheersId ?? "");
    if (!cheersId) return new Response(JSON.stringify({ error: "cheers_id_required" }), { status: 400, headers });

    const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
    const { data: cheers, error: cheersError } = await admin.from("cheers").select("id, sender_id, receiver_id").eq("id", cheersId).single();
    if (cheersError || !cheers) return new Response(JSON.stringify({ error: "cheers_not_found" }), { status: 404, headers });
    if (cheers.sender_id !== caller.id) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers });

    const recipientId = cheers.receiver_id;
    const { data: blocked } = await admin.rpc("is_blocked_between", { user_a: caller.id, user_b: recipientId });
    if (blocked) return new Response(JSON.stringify({ ok: true, skipped: "blocked" }), { status: 200, headers });

    const [{ data: recipientProfile }, { data: senderProfile }, { data: pushTokens }, { data: reciprocal }] = await Promise.all([
      admin.from("profiles").select("is_active, active_until").eq("id", recipientId).maybeSingle(),
      admin.from("profiles").select("name").eq("id", caller.id).maybeSingle(),
      admin.from("device_push_tokens").select("token").eq("user_id", recipientId),
      admin.from("cheers").select("id").eq("sender_id", recipientId).eq("receiver_id", caller.id).maybeSingle(),
    ]);

    const activeUntil = recipientProfile?.active_until ? new Date(recipientProfile.active_until).getTime() : 0;
    if (recipientProfile?.is_active !== true || !Number.isFinite(activeUntil) || activeUntil <= Date.now()) {
      return new Response(JSON.stringify({ ok: true, skipped: "recipient_inactive" }), { status: 200, headers });
    }

    const tokens = (pushTokens ?? []).map((row: any) => row.token).filter((value: unknown) => typeof value === "string");
    if (!tokens.length) return new Response(JSON.stringify({ ok: true, skipped: "no_push_token" }), { status: 200, headers });

    const senderName = senderProfile?.name || "SipMate";
    const mutual = Boolean(reciprocal);
    const payload = tokens.map((pushToken: string) => ({
      to: pushToken,
      sound: "default",
      channelId: "cheers",
      title: mutual ? "🍻 CHEERS!" : "🍻 New Cheers!",
      body: mutual ? `You and ${senderName} are both up for a drink.` : `${senderName} sent you a Cheers.`,
      data: { type: "cheers", id: caller.id, name: senderName, mutual },
      priority: "high",
    }));

    const pushResponse = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json", "Accept-Encoding": "gzip, deflate" },
      body: JSON.stringify(payload),
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
        .in("token", staleTokens);
      if (cleanupError) console.error("STALE PUSH TOKEN CLEANUP ERROR", cleanupError);
    }
    if (!pushResponse.ok) return new Response(JSON.stringify({ error: "push_failed" }), { status: 502, headers });
    return new Response(JSON.stringify({ ok: true, mutual, result }), { status: 200, headers });
  } catch (error) {
    console.error("CHEERS NOTIFICATION ERROR", error);
    return new Response(JSON.stringify({ error: "server_error" }), { status: 500, headers });
  }
});
