import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

function cleanReferral(value: unknown) {
  const normalized = String(value ?? "").trim().toUpperCase();
  return /^[A-Z0-9_-]{3,32}$/.test(normalized) ? normalized : null;
}

function cleanSource(value: unknown) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return /^[a-z0-9._-]{1,80}$/.test(normalized) ? normalized : null;
}

Deno.serve(async (req) => {
  const headers = { "Content-Type": "application/json" };
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers });

    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anon || !service) return new Response(JSON.stringify({ error: "not_configured" }), { status: 500, headers });

    const caller = createClient(url, anon, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
    const { data: userData, error: userError } = await caller.auth.getUser(token);
    const user = userData?.user;
    if (userError || !user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers });

    const body = await req.json().catch(() => ({}));
    const referral = cleanReferral(body?.referralCode);
    const source = cleanSource(body?.source);
    if (!referral && !source) return new Response(JSON.stringify({ ok: true, skipped: "empty" }), { status: 200, headers });

    const admin = createClient(url, service, { auth: { persistSession: false } });
    const { data: profile, error: profileError } = await admin.from("profiles")
      .select("id,invite_code,referred_by_code,attribution_source")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError || !profile) return new Response(JSON.stringify({ error: "profile_not_found" }), { status: 404, headers });

    let acceptedReferral: string | null = null;
    if (referral && referral !== profile.invite_code && !profile.referred_by_code) {
      const [{ data: profileRef }, { data: waitlistRef }] = await Promise.all([
        admin.from("profiles").select("id").eq("invite_code", referral).neq("id", user.id).maybeSingle(),
        admin.from("waitlist").select("id").eq("referral_code", referral).maybeSingle(),
      ]);
      if (profileRef || waitlistRef) acceptedReferral = referral;
    }

    const update: Record<string, string> = {};
    if (acceptedReferral) update.referred_by_code = acceptedReferral;
    if (source && !profile.attribution_source) update.attribution_source = source;

    if (Object.keys(update).length) {
      const { error } = await admin.from("profiles").update(update).eq("id", user.id);
      if (error) throw error;
    }

    return new Response(JSON.stringify({ ok: true, referralAccepted: Boolean(acceptedReferral), sourceAccepted: Boolean(update.attribution_source) }), { status: 200, headers });
  } catch (error) {
    console.error("CLAIM ATTRIBUTION ERROR", error);
    return new Response(JSON.stringify({ error: "server_error" }), { status: 500, headers });
  }
});
