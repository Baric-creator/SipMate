import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set(["https://officialsipmate.com","https://www.officialsipmate.com"]);
const ADMIN_EMAILS = new Set(["sipmate.app@gmail.com"]);
const VALID_PHASES = new Set(["waitlist","preregister","live"]);
const VALID_FLAGS = new Set(["premium","verified_photos","discord","nearby","founders_offer"]);

function cors(origin: string | null) {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://officialsipmate.com";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  };
}

function cleanPlayUrl(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    if (!["play.google.com","www.play.google.com"].includes(url.hostname)) return null;
    return url.toString();
  } catch { return null; }
}

function cleanFeatureFlags(value: unknown, current: Record<string, boolean>) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return current;
  const next = { ...current };
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (VALID_FLAGS.has(key) && typeof raw === "boolean") next[key] = raw;
  }
  return next;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const headers = cors(origin);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (!new Set(["GET","POST"]).has(req.method)) return new Response(JSON.stringify({ ok:false,error:"method_not_allowed" }), { status:405,headers });
  if (origin && !ALLOWED_ORIGINS.has(origin)) return new Response(JSON.stringify({ ok:false,error:"origin_not_allowed" }), { status:403,headers });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceKey) throw new Error("missing_config");

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return new Response(JSON.stringify({ ok:false,error:"unauthorized" }), { status:401,headers });

    const authClient = createClient(supabaseUrl, anonKey, { auth:{ persistSession:false } });
    const { data:userData,error:userError } = await authClient.auth.getUser(token);
    const email = userData?.user?.email?.toLowerCase() || "";
    if (userError || !userData?.user || !ADMIN_EMAILS.has(email)) {
      return new Response(JSON.stringify({ ok:false,error:"forbidden" }), { status:403,headers });
    }

    const sb = createClient(supabaseUrl, serviceKey, { auth:{ persistSession:false } });
    const { data: current, error: currentError } = await sb.from("launch_config")
      .select("phase,play_store_url,maintenance_mode,min_android_version_code,feature_flags,updated_at")
      .eq("id",true).maybeSingle();
    if (currentError) throw currentError;

    if (req.method === "GET") {
      return new Response(JSON.stringify({ ok:true,launch: current ?? {
        phase:"waitlist",play_store_url:null,maintenance_mode:false,min_android_version_code:1,feature_flags:{},updated_at:null
      }}), { headers });
    }

    const body = await req.json().catch(() => ({}));
    const phase = body?.phase === undefined ? (current?.phase ?? "waitlist") : String(body.phase).toLowerCase().trim();
    if (!VALID_PHASES.has(phase)) return new Response(JSON.stringify({ ok:false,error:"invalid_phase" }), { status:400,headers });

    const rawUrl = body?.play_store_url === undefined ? String(current?.play_store_url ?? "") : String(body.play_store_url ?? "").trim();
    const playStoreUrl = rawUrl ? cleanPlayUrl(rawUrl) : null;
    if (rawUrl && !playStoreUrl) return new Response(JSON.stringify({ ok:false,error:"invalid_play_store_url" }), { status:400,headers });
    if (["preregister","live"].includes(phase) && !playStoreUrl) {
      return new Response(JSON.stringify({ ok:false,error:"play_store_url_required" }), { status:400,headers });
    }

    const maintenanceMode = typeof body?.maintenance_mode === "boolean" ? body.maintenance_mode : Boolean(current?.maintenance_mode);
    const minAndroidVersionCode = body?.min_android_version_code === undefined
      ? Number(current?.min_android_version_code ?? 1)
      : Number(body.min_android_version_code);
    if (!Number.isInteger(minAndroidVersionCode) || minAndroidVersionCode < 1 || minAndroidVersionCode > 1000000) {
      return new Response(JSON.stringify({ ok:false,error:"invalid_min_android_version_code" }), { status:400,headers });
    }

    const currentFlags = current?.feature_flags && typeof current.feature_flags === "object" ? current.feature_flags as Record<string,boolean> : {};
    const featureFlags = cleanFeatureFlags(body?.feature_flags, currentFlags);

    const { data,error } = await sb.from("launch_config").upsert({
      id:true,
      phase,
      play_store_url:playStoreUrl,
      maintenance_mode:maintenanceMode,
      min_android_version_code:minAndroidVersionCode,
      feature_flags:featureFlags,
      updated_at:new Date().toISOString(),
    }).select("phase,play_store_url,maintenance_mode,min_android_version_code,feature_flags,updated_at").single();
    if (error) throw error;

    return new Response(JSON.stringify({ ok:true,launch:data }), { headers });
  } catch (err) {
    console.error("admin-launch-config",err);
    return new Response(JSON.stringify({ ok:false,error:"server_error" }), { status:500,headers });
  }
});