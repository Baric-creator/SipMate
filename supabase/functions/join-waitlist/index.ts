import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const allowedOrigins = new Set([
  "https://officialsipmate.com",
  "https://www.officialsipmate.com",
]);
const MAX_BODY_BYTES = 8_192;

const betaWelcomeCopy={
 en:{subject:"Welcome to the SipMate Beta 🍻",title:"You're in.",body:"Thanks for joining the SipMate Google Play Closed Test. Your email is saved for beta access. We'll send you another email when your Google Play access is ready."},
 de:{subject:"Willkommen bei der SipMate Beta 🍻",title:"Du bist dabei.",body:"Danke, dass du am SipMate Google Play Closed Test teilnimmst. Deine E-Mail ist für den Beta-Zugang gespeichert. Wir senden dir eine weitere E-Mail, sobald dein Google-Play-Zugang bereit ist."},
 hr:{subject:"Dobrodošao/la u SipMate Betu 🍻",title:"Unutra si.",body:"Hvala što sudjeluješ u SipMate Google Play Closed Testu. Tvoj e-mail je spremljen za beta pristup. Poslat ćemo ti još jedan e-mail čim tvoj Google Play pristup bude spreman."}
} as const;
function escapeHtml(s:string){return s.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;")}
async function sendBetaWelcome(supabase:any,email:string,name:string|null,locale:string){
 const {data:row}=await supabase.from("waitlist").select("beta_welcome_sent_at").eq("email",email).maybeSingle();if(row?.beta_welcome_sent_at)return;
 const key=Deno.env.get("RESEND_API_KEY"),from=Deno.env.get("RESEND_FROM_EMAIL");if(!key||!from){console.error("BETA WELCOME EMAIL CONFIGURATION ERROR");return}
 const lang=(["en","de","hr"].includes(locale)?locale:"en") as keyof typeof betaWelcomeCopy,t=betaWelcomeCopy[lang],safeName=name?escapeHtml(name):"";
 const html=`<!doctype html><html><body style="margin:0;background:#080808;color:#f5f5f4;font-family:Arial,sans-serif;padding:28px"><div style="max-width:580px;margin:auto;background:#141416;border:1px solid #29292e;border-radius:22px;padding:30px"><div style="color:#ff3b30;font-weight:900">SIPMATE BETA 🍻</div><h1>${escapeHtml(t.title)}${safeName?" "+safeName:""}</h1><p style="line-height:1.65;color:#d4d4d8">${escapeHtml(t.body)}</p><p style="color:#8d8d95;font-size:12px">SipMate · Social, not dating.</p></div></body></html>`;
 try{const rr=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({from,to:[email],subject:t.subject,html}),signal:AbortSignal.timeout(8000)});if(!rr.ok){console.error("BETA WELCOME EMAIL ERROR",rr.status,await rr.text().catch(()=>""));return}await supabase.from("waitlist").update({beta_welcome_sent_at:new Date().toISOString()}).eq("email",email).is("beta_welcome_sent_at",null)}catch(e){console.error("BETA WELCOME EMAIL ERROR",e)}
}


const FOUNDER_VAPID_PUBLIC_KEY="BDbHX9DzFahJzGGV8n3MUvD78ONVXped35gYCFW-bcfB5waWMUBISNU1aETAMYalubnzsAcaT2he_rTXY_eo2Hk";
async function notifyFounderNewBeta(supabase:any,name:string|null,locale:string){
 try{
  const {data:cfg}=await supabase.from("founder_push_config").select("vapid_private_key").eq("id",true).maybeSingle();
  const privateKey=cfg?.vapid_private_key;if(!privateKey)return;
  const {data:subs}=await supabase.from("founder_push_subscriptions").select("endpoint,p256dh,auth");
  if(!subs?.length)return;
  webpush.setVapidDetails("mailto:sipmate.app@gmail.com",FOUNDER_VAPID_PUBLIC_KEY,privateKey);
  const payload=JSON.stringify({title:"🍻 New SipMate Beta Tester!",body:name?name+" just joined the Closed Beta.":"A new tester just joined the Closed Beta.",url:"/admin.html?tab=beta"});
  for(const s of subs){
   try{await webpush.sendNotification({endpoint:s.endpoint,keys:{p256dh:s.p256dh,auth:s.auth}},payload,{TTL:300});}
   catch(e:any){const status=e?.statusCode||e?.status;if(status===404||status===410)await supabase.from("founder_push_subscriptions").delete().eq("endpoint",s.endpoint);else console.error("FOUNDER PUSH ERROR",status||e)}
  }
 }catch(e){console.error("FOUNDER PUSH ERROR",e)}
}


function cors(origin: string | null) {
  const allow = origin && allowedOrigins.has(origin) ? origin : "https://officialsipmate.com";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const headers = { ...cors(origin), "Content-Type": "application/json" };

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers });
  if (origin && !allowedOrigins.has(origin)) return new Response(JSON.stringify({ error: "origin_not_allowed" }), { status: 403, headers });

  const declaredLength = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return new Response(JSON.stringify({ error: "request_too_large" }), { status: 413, headers });
  }

  try {
    let body: Record<string, unknown>;
    try {
      const rawBody = await req.text();
      if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
        return new Response(JSON.stringify({ error: "request_too_large" }), { status: 413, headers });
      }
      body = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400, headers });
    }

    const email = String(body?.email ?? "").trim().toLowerCase();
    const name = String(body?.name ?? "").trim().slice(0, 80) || null;
    const city = String(body?.city ?? "").trim().slice(0, 120) || null;
    const locale = ["en", "de", "hr"].includes(String(body?.locale ?? "")) ? String(body.locale) : "en";
    const refRaw = String(body?.ref ?? "").trim().toUpperCase();
    const referredByCode = /^[A-Z0-9_-]{3,32}$/.test(refRaw) ? refRaw : null;
    const sourceRaw = String(body?.source ?? "").trim().toLowerCase();
    const source = /^[a-z0-9._-]{1,80}$/.test(sourceRaw) ? sourceRaw : "officialsipmate.com";
    const betaOptIn = body?.beta_opt_in === true;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return new Response(JSON.stringify({ error: "invalid_email" }), { status: 400, headers });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("WAITLIST FUNCTION CONFIGURATION ERROR");
      return new Response(JSON.stringify({ error: "temporarily_unavailable" }), { status: 503, headers });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

    const { error } = await supabase
      .from("waitlist")
      .insert({
        email, name, city, locale, source, referred_by_code: referredByCode,
        beta_opt_in_at: betaOptIn ? new Date().toISOString() : null,
        play_test_status: betaOptIn ? "pending_add" : "not_requested",
      });

    if (error?.code === "23505") {
      if (betaOptIn) {
        const { error: updateError } = await supabase
          .from("waitlist")
          .update({
            beta_opt_in_at: new Date().toISOString(),
            play_test_status: "pending_add",
            source,
          })
          .eq("email", email);
        if (updateError) throw updateError;
      }
      if(betaOptIn) await sendBetaWelcome(supabase,email,name,locale);
      return new Response(JSON.stringify({ ok: true, already: true, beta_opt_in: betaOptIn }), { status: 200, headers });
    }
    if (error) throw error;
    if(betaOptIn) {
      await sendBetaWelcome(supabase,email,name,locale);
      await notifyFounderNewBeta(supabase,name,locale);
    }

    return new Response(JSON.stringify({ ok: true }), { status: 201, headers });
  } catch (error) {
    console.error("WAITLIST ERROR", error);
    return new Response(JSON.stringify({ error: "server_error" }), { status: 500, headers });
  }
});