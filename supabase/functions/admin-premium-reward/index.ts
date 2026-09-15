import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set([
  "https://officialsipmate.com",
  "https://www.officialsipmate.com",
]);
const ADMIN_EMAILS = new Set(["sipmate.app@gmail.com"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DISCORD_ID_PATTERN = /^\d{17,20}$/;
const ALLOWED_SOURCES = new Set(["discord_25_crew", "giveaway", "manual", "founder", "ambassador", "bug_bounty"]);
const MAX_BODY_BYTES = 8_192;

function cors(origin: string | null) {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://officialsipmate.com";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  };
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const headers = cors(origin);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (origin && !ALLOWED_ORIGINS.has(origin)) return new Response(JSON.stringify({ ok: false, error: "origin_not_allowed" }), { status: 403, headers });
  if (req.method !== "POST") return new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), { status: 405, headers });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceKey) {
      return new Response(JSON.stringify({ ok: false, error: "temporarily_unavailable" }), { status: 503, headers });
    }

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), { status: 401, headers });

    const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    const adminUser = userData?.user;
    const email = adminUser?.email?.toLowerCase() || "";
    if (userError || !adminUser || !ADMIN_EMAILS.has(email)) {
      return new Response(JSON.stringify({ ok: false, error: "forbidden" }), { status: 403, headers });
    }

    const rawBody = await req.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return new Response(JSON.stringify({ ok: false, error: "request_too_large" }), { status: 413, headers });
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody || "{}");
    } catch {
      return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), { status: 400, headers });
    }

    const requestedUserId = String(body.user_id ?? "").trim();
    const discordUserId = String(body.discord_user_id ?? "").trim();
    const source = String(body.source ?? "").trim();
    const externalReference = String(body.external_reference ?? "").trim();
    const durationDays = Number(body.duration_days ?? 365);

    if (requestedUserId && !UUID_PATTERN.test(requestedUserId)) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_user_id" }), { status: 400, headers });
    }
    if (discordUserId && !DISCORD_ID_PATTERN.test(discordUserId)) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_discord_user_id" }), { status: 400, headers });
    }
    if (!requestedUserId && !discordUserId) {
      return new Response(JSON.stringify({ ok: false, error: "target_required" }), { status: 400, headers });
    }
    if (requestedUserId && discordUserId) {
      return new Response(JSON.stringify({ ok: false, error: "one_target_only" }), { status: 400, headers });
    }
    if (!ALLOWED_SOURCES.has(source)) return new Response(JSON.stringify({ ok: false, error: "invalid_source" }), { status: 400, headers });
    if (externalReference.length < 1 || externalReference.length > 160) return new Response(JSON.stringify({ ok: false, error: "invalid_external_reference" }), { status: 400, headers });
    if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 3650) return new Response(JSON.stringify({ ok: false, error: "invalid_duration_days" }), { status: 400, headers });

    const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    let userId = requestedUserId;
    let targetProfile: { id: string; name: string | null; discord_username: string | null } | null = null;

    if (discordUserId) {
      const { data: profile, error: profileError } = await sb
        .from("profiles")
        .select("id,name,discord_username")
        .eq("discord_user_id", discordUserId)
        .maybeSingle();
      if (profileError) {
        console.error("ADMIN PREMIUM TARGET LOOKUP ERROR", profileError);
        return new Response(JSON.stringify({ ok: false, error: "target_lookup_failed" }), { status: 500, headers });
      }
      if (!profile) return new Response(JSON.stringify({ ok: false, error: "discord_not_linked" }), { status: 404, headers });
      userId = profile.id;
      targetProfile = profile;
    }

    const { data, error } = await sb.rpc("grant_premium_reward", {
      p_user_id: userId,
      p_source: source,
      p_external_reference: externalReference,
      p_duration_days: durationDays,
      p_metadata: {
        ...(body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata) ? body.metadata as Record<string, unknown> : {}),
        granted_by_user_id: adminUser.id,
        ...(discordUserId ? { discord_user_id: discordUserId } : {}),
      },
    });

    if (error) {
      console.error("ADMIN PREMIUM REWARD ERROR", error);
      return new Response(JSON.stringify({ ok: false, error: "grant_failed" }), { status: 500, headers });
    }

    const result = Array.isArray(data) ? data[0] : data;
    return new Response(JSON.stringify({
      ok: true,
      granted: Boolean(result?.granted),
      premium_until: result?.premium_until ?? null,
      user_id: userId,
      target: targetProfile ? { name: targetProfile.name, discord_username: targetProfile.discord_username } : null,
    }), { status: 200, headers });
  } catch (error) {
    console.error("ADMIN PREMIUM REWARD ERROR", error);
    return new Response(JSON.stringify({ ok: false, error: "server_error" }), { status: 500, headers });
  }
});
