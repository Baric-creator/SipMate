import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set([
  "https://officialsipmate.com",
  "https://www.officialsipmate.com",
]);
const ADMIN_EMAILS = new Set(["sipmate.app@gmail.com"]);
const ALLOWED_STATUSES = new Set(["pending", "reviewed", "dismissed"]);

function cors(origin: string | null) {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://officialsipmate.com";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, PATCH, OPTIONS",
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
  if (!["GET", "PATCH"].includes(req.method)) return new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), { status: 405, headers });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceKey) throw new Error("missing_config");

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

    const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    if (req.method === "PATCH") {
      const body = await req.json().catch(() => ({}));
      const reportId = String(body?.report_id || "").trim();
      const status = String(body?.status || "").trim();
      if (!reportId || !ALLOWED_STATUSES.has(status)) {
        return new Response(JSON.stringify({ ok: false, error: "invalid_request" }), { status: 400, headers });
      }

      const update = status === "pending"
        ? { status, reviewed_at: null, reviewed_by: null }
        : { status, reviewed_at: new Date().toISOString(), reviewed_by: adminUser.id };

      const { data, error } = await sb.from("reports")
        .update(update)
        .eq("id", reportId)
        .select("id,status,reviewed_at,reviewed_by")
        .maybeSingle();
      if (error) throw error;
      if (!data) return new Response(JSON.stringify({ ok: false, error: "not_found" }), { status: 404, headers });
      return new Response(JSON.stringify({ ok: true, report: data }), { headers });
    }

    const { data: reports, error: reportsError } = await sb.from("reports")
      .select("id,reporter_id,reported_id,reason,details,status,created_at,reviewed_at,reviewed_by")
      .order("created_at", { ascending: false })
      .limit(100);
    if (reportsError) throw reportsError;

    const ids = [...new Set((reports ?? []).flatMap((r) => [r.reporter_id, r.reported_id]).filter(Boolean))];
    const { data: profiles, error: profilesError } = ids.length
      ? await sb.from("profiles").select("id,name,age,city,avatar_url").in("id", ids)
      : { data: [], error: null };
    if (profilesError) throw profilesError;
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    const rows = (reports ?? []).map((r) => ({
      ...r,
      reporter: profileMap.get(r.reporter_id) ?? { id: r.reporter_id, name: null, age: null, city: null, avatar_url: null },
      reported: profileMap.get(r.reported_id) ?? { id: r.reported_id, name: null, age: null, city: null, avatar_url: null },
    }));

    const counts = {
      pending: rows.filter((r) => r.status === "pending").length,
      reviewed: rows.filter((r) => r.status === "reviewed").length,
      dismissed: rows.filter((r) => r.status === "dismissed").length,
    };

    return new Response(JSON.stringify({ ok: true, counts, reports: rows }), { headers });
  } catch (error) {
    console.error("admin-moderation", error);
    return new Response(JSON.stringify({ ok: false, error: "server_error" }), { status: 500, headers });
  }
});
