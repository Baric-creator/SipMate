import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set([
  "https://officialsipmate.com",
  "https://www.officialsipmate.com",
]);
const ADMIN_EMAILS = new Set(["sipmate.app@gmail.com"]);
const ALLOWED_STATUSES = new Set(["pending", "reviewed", "dismissed"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
      const action = String(body?.action || "").trim();
      const status = String(body?.status || "").trim();
      if (!UUID_PATTERN.test(reportId) || (action !== "remove_image" && !ALLOWED_STATUSES.has(status))) {
        return new Response(JSON.stringify({ ok: false, error: "invalid_request" }), { status: 400, headers });
      }

      if (action === "remove_image") {
        const { data: report, error: reportError } = await sb.from("reports")
          .select("id,report_kind,reported_message_id,status")
          .eq("id", reportId)
          .maybeSingle();
        if (reportError) throw reportError;
        if (!report || report.report_kind !== "chat_image" || !report.reported_message_id) {
          return new Response(JSON.stringify({ ok: false, error: "not_a_chat_image_report" }), { status: 400, headers });
        }

        const { data: message, error: messageError } = await sb.from("messages")
          .select("id,message_type,image_path,image_moderation_status")
          .eq("id", report.reported_message_id)
          .maybeSingle();
        if (messageError) throw messageError;
        if (!message || message.message_type !== "image") {
          return new Response(JSON.stringify({ ok: false, error: "image_message_not_found" }), { status: 404, headers });
        }

        if (message.image_path) {
          const { error: storageError } = await sb.storage.from("chat-images").remove([message.image_path]);
          if (storageError) throw storageError;
        }

        const { error: messageUpdateError } = await sb.from("messages")
          .update({
            image_path: null,
            image_moderation_status: "rejected",
            content: "📷 Photo removed by moderation",
          })
          .eq("id", message.id);
        if (messageUpdateError) throw messageUpdateError;

        const { data: updatedReport, error: updateReportError } = await sb.from("reports")
          .update({ status: "reviewed", reviewed_at: new Date().toISOString(), reviewed_by: adminUser.id })
          .eq("id", reportId)
          .select("id,status,reviewed_at,reviewed_by,reported_id,reported_message_id")
          .maybeSingle();
        if (updateReportError) throw updateReportError;

        const { error: auditError } = await sb.from("moderation_actions").insert({
          report_id: reportId,
          action: "photo_removed",
          admin_user_id: adminUser.id,
          reported_user_id: updatedReport?.reported_id ?? null,
          reported_message_id: updatedReport?.reported_message_id ?? null,
        });
        if (auditError) console.error("MODERATION AUDIT ERROR", auditError);

        return new Response(JSON.stringify({ ok: true, removed: true, report: updatedReport }), { headers });
      }

      const update = status === "pending"
        ? { status, reviewed_at: null, reviewed_by: null }
        : { status, reviewed_at: new Date().toISOString(), reviewed_by: adminUser.id };

      const { data, error } = await sb.from("reports")
        .update(update)
        .eq("id", reportId)
        .select("id,status,reviewed_at,reviewed_by,reported_id,reported_message_id")
        .maybeSingle();
      if (error) throw error;
      if (!data) return new Response(JSON.stringify({ ok: false, error: "not_found" }), { status: 404, headers });

      const auditAction = status === "reviewed" ? "reviewed" : status === "dismissed" ? "dismissed" : "reopened";
      const { error: auditError } = await sb.from("moderation_actions").insert({
        report_id: reportId,
        action: auditAction,
        admin_user_id: adminUser.id,
        reported_user_id: data.reported_id ?? null,
        reported_message_id: data.reported_message_id ?? null,
      });
      if (auditError) console.error("MODERATION AUDIT ERROR", auditError);

      return new Response(JSON.stringify({ ok: true, report: data }), { headers });
    }

    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [
      reportsResult,
      approvedTotalResult,
      approved7dResult,
      aiTotalResult,
      ai7dResult,
      unsafeTotalResult,
      unsafe7dResult,
      imageReportsTotalResult,
      imageReports7dResult,
      approvedTrendResult,
      safetyTrendResult,
      reportTrendResult,
    ] = await Promise.all([
      sb.from("reports")
        .select("id,reporter_id,reported_id,reason,details,status,created_at,reviewed_at,reviewed_by,report_kind,reported_message_id")
        .order("created_at", { ascending: false })
        .limit(100),
      sb.from("messages").select("id", { count:"exact", head:true }).eq("message_type","image").eq("image_moderation_status","approved"),
      sb.from("messages").select("id", { count:"exact", head:true }).eq("message_type","image").eq("image_moderation_status","approved").gte("created_at",since7d),
      sb.from("chat_image_safety_events").select("id", { count:"exact", head:true }).eq("outcome","ai_rejected"),
      sb.from("chat_image_safety_events").select("id", { count:"exact", head:true }).eq("outcome","ai_rejected").gte("created_at",since7d),
      sb.from("chat_image_safety_events").select("id", { count:"exact", head:true }).eq("outcome","unsafe_rejected"),
      sb.from("chat_image_safety_events").select("id", { count:"exact", head:true }).eq("outcome","unsafe_rejected").gte("created_at",since7d),
      sb.from("reports").select("id", { count:"exact", head:true }).eq("report_kind","chat_image"),
      sb.from("reports").select("id", { count:"exact", head:true }).eq("report_kind","chat_image").gte("created_at",since7d),
      sb.from("messages").select("created_at").eq("message_type","image").eq("image_moderation_status","approved").gte("created_at",since7d),
      sb.from("chat_image_safety_events").select("outcome,created_at").gte("created_at",since7d),
      sb.from("reports").select("created_at").eq("report_kind","chat_image").gte("created_at",since7d),
    ]);
    const reports = reportsResult.data;
    const reportsError = reportsResult.error;
    if (
      reportsError || approvedTotalResult.error || approved7dResult.error ||
      aiTotalResult.error || ai7dResult.error || unsafeTotalResult.error ||
      unsafe7dResult.error || imageReportsTotalResult.error || imageReports7dResult.error ||
      approvedTrendResult.error || safetyTrendResult.error || reportTrendResult.error
    ) {
      throw reportsError ?? approvedTotalResult.error ?? approved7dResult.error ??
        aiTotalResult.error ?? ai7dResult.error ?? unsafeTotalResult.error ??
        unsafe7dResult.error ?? imageReportsTotalResult.error ?? imageReports7dResult.error ??
        approvedTrendResult.error ?? safetyTrendResult.error ?? reportTrendResult.error;
    }

    const ids = [...new Set((reports ?? []).flatMap((r) => [r.reporter_id, r.reported_id]).filter(Boolean))];
    const { data: profiles, error: profilesError } = ids.length
      ? await sb.from("profiles").select("id,name,age,city,avatar_url").in("id", ids)
      : { data: [], error: null };
    if (profilesError) throw profilesError;
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    const reportedMessageIds = [...new Set((reports ?? []).map((r) => r.reported_message_id).filter(Boolean))];
    const { data: reportedMessages, error: messageError } = reportedMessageIds.length
      ? await sb.from("messages")
          .select("id,conversation_id,sender_id,message_type,image_path,image_moderation_status,created_at")
          .in("id", reportedMessageIds)
      : { data: [], error: null };
    if (messageError) throw messageError;
    const messageMap = new Map((reportedMessages ?? []).map((m) => [m.id, m]));

    const rows = [];
    for (const r of reports ?? []) {
      let reported_content: any = null;
      const m: any = r.reported_message_id ? messageMap.get(r.reported_message_id) : null;
      if (r.report_kind === "chat_image" && m?.message_type === "image" && m?.image_path) {
        const { data: signed, error: signedError } = await sb.storage
          .from("chat-images")
          .createSignedUrl(m.image_path, 300);
        if (!signedError && signed?.signedUrl) {
          reported_content = {
            kind: "chat_image",
            message_id: m.id,
            created_at: m.created_at,
            image_url: signed.signedUrl,
            expires_in: 300,
          };
        }
      }

      rows.push({
        ...r,
        reporter: profileMap.get(r.reporter_id) ?? { id: r.reporter_id, name: null, age: null, city: null, avatar_url: null },
        reported: profileMap.get(r.reported_id) ?? { id: r.reported_id, name: null, age: null, city: null, avatar_url: null },
        reported_content,
      });
    }

    const counts = {
      pending: rows.filter((r) => r.status === "pending").length,
      reviewed: rows.filter((r) => r.status === "reviewed").length,
      dismissed: rows.filter((r) => r.status === "dismissed").length,
    };

    const dayKey = (value:string) => new Date(value).toISOString().slice(0,10);
    const daily = Array.from({ length: 7 }, (_, index) => {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - (6 - index));
      return { date: d.toISOString().slice(0,10), approved: 0, ai_blocked: 0, unsafe_blocked: 0, reported: 0 };
    });
    const dailyMap = new Map(daily.map((row) => [row.date, row]));
    for (const row of approvedTrendResult.data ?? []) {
      const item = dailyMap.get(dayKey(row.created_at));
      if (item) item.approved += 1;
    }
    for (const row of safetyTrendResult.data ?? []) {
      const item = dailyMap.get(dayKey(row.created_at));
      if (!item) continue;
      if (row.outcome === "ai_rejected") item.ai_blocked += 1;
      if (row.outcome === "unsafe_rejected") item.unsafe_blocked += 1;
    }
    for (const row of reportTrendResult.data ?? []) {
      const item = dailyMap.get(dayKey(row.created_at));
      if (item) item.reported += 1;
    }

    const blocked7d = (ai7dResult.count ?? 0) + (unsafe7dResult.count ?? 0);
    const attention = blocked7d >= 5 || (imageReports7dResult.count ?? 0) >= 3;

    const photo_safety = {
      approved: { total: approvedTotalResult.count ?? 0, last_7d: approved7dResult.count ?? 0 },
      ai_blocked: { total: aiTotalResult.count ?? 0, last_7d: ai7dResult.count ?? 0 },
      unsafe_blocked: { total: unsafeTotalResult.count ?? 0, last_7d: unsafe7dResult.count ?? 0 },
      reported: { total: imageReportsTotalResult.count ?? 0, last_7d: imageReports7dResult.count ?? 0 },
      daily_7d: daily,
      attention: {
        active: attention,
        reason: attention ? (blocked7d >= 5 ? "blocked_volume" : "report_volume") : "normal",
        blocked_7d: blocked7d,
        reports_7d: imageReports7dResult.count ?? 0,
      },
    };

    return new Response(JSON.stringify({ ok: true, counts, photo_safety, reports: rows }), { headers });
  } catch (error) {
    console.error("admin-moderation", error);
    return new Response(JSON.stringify({ ok: false, error: "server_error" }), { status: 500, headers });
  }
});
