import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_ORIGINS = new Set([
  "https://officialsipmate.com",
  "https://www.officialsipmate.com",
]);
const BUCKET = "chat-images";
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg","image/png","image/webp"]);

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
function json(body: unknown, status: number, headers: Record<string,string>) {
  return new Response(JSON.stringify(body), { status, headers });
}
function premiumActive(p: any) {
  return p?.is_premium === true && (!p?.premium_until || new Date(p.premium_until).getTime() > Date.now());
}
function maxNum(...values: unknown[]) {
  return Math.max(0, ...values.map(v => Number(v || 0)).filter(Number.isFinite));
}
async function logSafetyEvent(sb:any,outcome:string,aiScore:number|null=null,nsfwScore:number|null=null){
  try {
    await sb.from("chat_image_safety_events").insert({
      outcome,
      ai_score: Number.isFinite(Number(aiScore)) ? Number(aiScore) : null,
      nsfw_score: Number.isFinite(Number(nsfwScore)) ? Number(nsfwScore) : null,
    });
  } catch (error) {
    console.log("chat image safety event skipped", error);
  }
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const headers = cors(origin);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return json({ ok:false,error:"method_not_allowed" },405,headers);
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json({ ok:false,error:"origin_not_allowed" },403,headers);

  let pendingPath = "";
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceKey) throw new Error("missing_config");

    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i,"");
    if (!token) return json({ok:false,error:"unauthorized"},401,headers);

    const authClient = createClient(supabaseUrl, anonKey, { auth:{persistSession:false} });
    const { data:userData, error:userError } = await authClient.auth.getUser(token);
    const user = userData?.user;
    if (userError || !user) return json({ok:false,error:"unauthorized"},401,headers);

    const body = await req.json().catch(()=>({}));
    const conversationId = String(body?.conversationId || "").trim();
    pendingPath = String(body?.path || "").trim();
    if (!UUID_RE.test(conversationId) || !pendingPath || pendingPath.length > 240) return json({ok:false,error:"invalid_request"},400,headers);
    const expectedPrefix = `pending/${user.id}/`;
    if (!pendingPath.startsWith(expectedPrefix) || pendingPath.includes("..")) {
      return json({ok:false,error:"invalid_path"},400,headers);
    }

    const sb = createClient(supabaseUrl, serviceKey, { auth:{persistSession:false} });
    await logSafetyEvent(sb,"attempt_received");

    try {
      const { data: staleCandidates } = await sb.storage.from(BUCKET).list(`pending/${user.id}`, { limit: 100 });
      const cutoff = Date.now() - 60 * 60 * 1000;
      const stalePaths = (staleCandidates || [])
        .filter((item:any) => item?.name && item?.created_at && new Date(item.created_at).getTime() < cutoff)
        .map((item:any) => `pending/${user.id}/${item.name}`)
        .filter((path:string) => path !== pendingPath);
      if (stalePaths.length) await sb.storage.from(BUCKET).remove(stalePaths);
    } catch (cleanupError) {
      console.log("pending image cleanup skipped", cleanupError);
    }
    const { data:conversation, error:conversationError } = await sb
      .from("conversations").select("id,user_one,user_two").eq("id",conversationId).maybeSingle();
    if (conversationError) throw conversationError;
    if (!conversation || (conversation.user_one !== user.id && conversation.user_two !== user.id)) {
      return json({ok:false,error:"conversation_forbidden"},403,headers);
    }
    await logSafetyEvent(sb,"conversation_ok");
    const otherId = conversation.user_one === user.id ? conversation.user_two : conversation.user_one;

    const { data:blockRows, error:blockError } = await sb
      .from("blocks")
      .select("id")
      .or(
        `and(blocker_id.eq.${user.id},blocked_id.eq.${otherId}),and(blocker_id.eq.${otherId},blocked_id.eq.${user.id})`
      )
      .limit(1);
    if (blockError) throw blockError;
    if ((blockRows || []).length > 0) return json({ok:false,error:"blocked"},403,headers);
    await logSafetyEvent(sb,"block_check_ok");

    const { data:profiles, error:profilesError } = await sb
      .from("profiles").select("id,is_premium,premium_until").in("id",[user.id,otherId]);
    if (profilesError) throw profilesError;
    const mine = (profiles || []).find((p:any)=>p.id===user.id);
    const other = (profiles || []).find((p:any)=>p.id===otherId);
    if (!premiumActive(mine) || !premiumActive(other)) {
      await logSafetyEvent(sb,"both_premium_required");
      return json({ok:false,error:"both_premium_required"},200,headers);
    }
    await logSafetyEvent(sb,"premium_ok");

    const { data:cheers, error:cheersError } = await sb
      .from("cheers").select("sender_id,receiver_id")
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${user.id})`);
    if (cheersError) throw cheersError;
    const mutual = (cheers || []).some((c:any)=>c.sender_id===user.id&&c.receiver_id===otherId)
      && (cheers || []).some((c:any)=>c.sender_id===otherId&&c.receiver_id===user.id);
    if (!mutual) {
      await logSafetyEvent(sb,"mutual_cheers_required");
      return json({ok:false,error:"mutual_cheers_required"},200,headers);
    }
    await logSafetyEvent(sb,"mutual_ok");

    const { data:fileBlob, error:downloadError } = await sb.storage.from(BUCKET).download(pendingPath);
    if (downloadError || !fileBlob) {
      await logSafetyEvent(sb,"upload_missing");
      return json({ok:false,error:"upload_not_found"},404,headers);
    }
    await logSafetyEvent(sb,"download_ok");
    if (fileBlob.size <= 0 || fileBlob.size > MAX_BYTES) {
      await sb.storage.from(BUCKET).remove([pendingPath]);
      await logSafetyEvent(sb,"file_too_large");
      return json({ok:false,error:"file_too_large"},200,headers);
    }
    const mime = fileBlob.type || "";
    if (!ALLOWED_TYPES.has(mime)) {
      await sb.storage.from(BUCKET).remove([pendingPath]);
      await logSafetyEvent(sb,"unsupported_image_type");
      return json({ok:false,error:"unsupported_image_type"},200,headers);
    }

    const apiUser = Deno.env.get("SIGHTENGINE_API_USER");
    const apiSecret = Deno.env.get("SIGHTENGINE_API_SECRET");
    if (!apiUser || !apiSecret) {
      await logSafetyEvent(sb,"verification_not_configured");
      await sb.storage.from(BUCKET).remove([pendingPath]);
      return json({ok:false,error:"image_verification_not_configured"},200,headers);
    }

    await logSafetyEvent(sb,"verification_start");
    const fd = new FormData();
    fd.append("media", fileBlob, pendingPath.split("/").pop() || "photo.jpg");
    fd.append("models", "genai,nudity-2.1");
    fd.append("api_user", apiUser);
    fd.append("api_secret", apiSecret);

    const moderationResponse = await fetch("https://api.sightengine.com/1.0/check.json", {
      method:"POST",
      body:fd,
      signal: AbortSignal.timeout(12000),
    });
    const moderation = await moderationResponse.json().catch(()=>null);
    if (!moderationResponse.ok || moderation?.status !== "success") {
      await logSafetyEvent(sb,"verification_failed");
      await sb.storage.from(BUCKET).remove([pendingPath]);
      return json({ok:false,error:"image_verification_failed"},200,headers);
    }

    const aiScore = Number(moderation?.type?.ai_generated ?? 0);
    const n = moderation?.nudity || {};
    const nsfwScore = maxNum(
      n?.sexual_activity,
      n?.sexual_display,
      n?.erotica,
      n?.very_suggestive
    );

    if (aiScore >= 0.70) {
      await logSafetyEvent(sb,"ai_rejected",aiScore,nsfwScore);
      await sb.storage.from(BUCKET).remove([pendingPath]);
      return json({ok:false,error:"ai_image_rejected",ai_score:aiScore},200,headers);
    }
    if (nsfwScore >= 0.65) {
      await logSafetyEvent(sb,"unsafe_rejected",aiScore,nsfwScore);
      await sb.storage.from(BUCKET).remove([pendingPath]);
      return json({ok:false,error:"unsafe_image_rejected"},200,headers);
    }

    const messageId = crypto.randomUUID();
    const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
    const approvedPath = `approved/${conversationId}/${messageId}.${ext}`;
    const { error:moveError } = await sb.storage.from(BUCKET).move(pendingPath, approvedPath);
    if (moveError) throw moveError;
    pendingPath = "";

    const { data:message, error:messageError } = await sb.from("messages").insert({
      id: messageId,
      conversation_id: conversationId,
      sender_id: user.id,
      content: "📷 Photo",
      message_type: "image",
      image_path: approvedPath,
      image_ai_score: Number.isFinite(aiScore) ? aiScore : null,
      image_moderation_status: "approved",
      image_verification_provider: "sightengine",
    }).select("id,conversation_id,sender_id,content,created_at,read_at,message_type,image_path,image_ai_score,image_moderation_status").single();

    if (messageError) {
      await sb.storage.from(BUCKET).remove([approvedPath]);
      throw messageError;
    }

    await logSafetyEvent(sb,"approved",aiScore,nsfwScore);
    return json({ok:true,message,verification:{ai_score:aiScore}},200,headers);
  } catch (error) {
    console.error("send-chat-image", error);
    try {
      const url = Deno.env.get("SUPABASE_URL");
      const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (url && service) {
        const trace = createClient(url,service,{auth:{persistSession:false}});
        await logSafetyEvent(trace,"server_error");
      }
    } catch {}
    try {
      if (pendingPath) {
        const url = Deno.env.get("SUPABASE_URL");
        const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (url && service) {
          const sb = createClient(url,service,{auth:{persistSession:false}});
          await sb.storage.from(BUCKET).remove([pendingPath]);
        }
      }
    } catch {}
    return json({ok:false,error:"server_error"},500,headers);
  }
});