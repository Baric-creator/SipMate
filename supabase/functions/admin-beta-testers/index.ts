import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const allowedOrigins=new Set(["https://officialsipmate.com","https://www.officialsipmate.com"]);
const allowedStatuses=new Set(["pending_add","added","opted_in","declined"]);
function cors(origin:string|null){const allow=origin&&allowedOrigins.has(origin)?origin:"https://officialsipmate.com";return {"Access-Control-Allow-Origin":allow,"Access-Control-Allow-Headers":"authorization, apikey, content-type","Access-Control-Allow-Methods":"GET, PATCH, OPTIONS","Vary":"Origin"}}
function esc(s:string){return s.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;")}
const accessCopy={
 en:{subject:"Your SipMate Beta access is ready 🍻",title:"You're on the tester list.",body:"Your Google Play email has been added to the SipMate Closed Test tester list. Please install SipMate and register your account within 48 hours. If no SipMate account is registered within that time, your beta access will expire so the place can be offered to another tester. Open SipMate on Google Play to continue.",cta:"Open SipMate on Google Play"},
 de:{subject:"Dein SipMate Beta-Zugang ist bereit 🍻",title:"Du bist auf der Testerliste.",body:"Deine Google-Play-E-Mail wurde zur SipMate Closed-Test-Testerliste hinzugefügt. Bitte installiere SipMate und registriere dein Konto innerhalb von 48 Stunden. Wenn in dieser Zeit kein SipMate-Konto registriert wird, läuft dein Beta-Zugang ab, damit der Platz einem anderen Tester angeboten werden kann. Öffne SipMate bei Google Play, um fortzufahren.",cta:"SipMate bei Google Play öffnen"},
 hr:{subject:"Tvoj SipMate Beta pristup je spreman 🍻",title:"Dodan/a si na listu testera.",body:"Tvoj Google Play e-mail dodan je na SipMate Closed Test listu testera. Instaliraj SipMate i registriraj račun unutar 48 sati. Ako se u tom roku ne registrira SipMate račun, tvoj beta pristup će isteći kako bismo mjesto mogli ponuditi drugom testeru. Otvori SipMate na Google Playu i nastavi s testiranjem.",cta:"Otvori SipMate na Google Playu"}
} as const;
async function sendAccessEmail(row:any,admin:any){
 if(row.beta_access_sent_at)return;
 const key=Deno.env.get("RESEND_API_KEY"),from=Deno.env.get("RESEND_FROM_EMAIL"); if(!key||!from)throw new Error("email_configuration_error");
 const lang=(["en","de","hr"].includes(row.locale)?row.locale:"en") as keyof typeof accessCopy,c=accessCopy[lang],name=String(row.name||"").trim().slice(0,80);
 const html=`<!doctype html><html><body style="margin:0;background:#080808;color:#f5f5f4;font-family:Arial,sans-serif;padding:28px"><div style="max-width:580px;margin:auto;background:#141416;border:1px solid #29292e;border-radius:22px;padding:30px"><div style="color:#ff3b30;font-weight:900">SIPMATE BETA 🍻</div><h1>${esc(c.title)}${name?" "+esc(name):""}</h1><p style="line-height:1.65;color:#d4d4d8">${esc(c.body)}</p><a href="https://play.google.com/store/apps/details?id=com.bariccreator.sipmate" style="display:inline-block;background:#ff3b30;color:#fff;text-decoration:none;font-weight:800;padding:14px 20px;border-radius:12px">${esc(c.cta)}</a><p style="margin-top:26px;color:#8d8d95;font-size:12px">SipMate · Social, not dating.</p></div></body></html>`;
 const rr=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({from,to:[row.email],subject:c.subject,html}),signal:AbortSignal.timeout(8000)});
 if(!rr.ok){console.error("BETA ACCESS EMAIL ERROR",rr.status,await rr.text().catch(()=>""));throw new Error("email_failed")}
 const {error}=await admin.from("waitlist").update({beta_access_sent_at:new Date().toISOString()}).eq("email",row.email).is("beta_access_sent_at",null);if(error)throw error;
}
Deno.serve(async(req)=>{
 const origin=req.headers.get("origin"),headers={...cors(origin),"Content-Type":"application/json"};
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers}); if(origin&&!allowedOrigins.has(origin))return new Response(JSON.stringify({error:"origin_not_allowed"}),{status:403,headers}); if(!["GET","PATCH"].includes(req.method))return new Response(JSON.stringify({error:"method_not_allowed"}),{status:405,headers});
 try{
  const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!url||!anon||!service)throw new Error("configuration_error");
  const auth=req.headers.get("authorization")||"",uc=createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}}),{data:{user},error:ue}=await uc.auth.getUser();if(ue||!user||user.email?.toLowerCase()!=="sipmate.app@gmail.com")return new Response(JSON.stringify({error:"forbidden"}),{status:403,headers});
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  if(req.method==="PATCH"){
   const body=await req.json().catch(()=>({})),email=String(body.email||"").trim().toLowerCase(),status=String(body.status||"");if(!email||!allowedStatuses.has(status))return new Response(JSON.stringify({error:"invalid_request"}),{status:400,headers});
   const {data:before,error:be}=await admin.from("waitlist").select("email,name,locale,play_test_status,beta_access_sent_at").eq("email",email).not("beta_opt_in_at","is",null).maybeSingle();if(be||!before)return new Response(JSON.stringify({error:"tester_not_found"}),{status:404,headers});
   const now=new Date(),statusPatch:any={play_test_status:status};if(status==="added"&&before.play_test_status!=="added"){statusPatch.beta_added_at=now.toISOString();statusPatch.beta_access_expires_at=new Date(now.getTime()+48*60*60*1000).toISOString();statusPatch.beta_expired_at=null}const {error}=await admin.from("waitlist").update(statusPatch).eq("email",email).not("beta_opt_in_at","is",null);if(error)throw error;
   if(status==="added"&&!before.beta_access_sent_at)await sendAccessEmail(before,admin);
  }
  const {data,error}=await admin.from("waitlist").select("email,name,locale,source,beta_opt_in_at,play_test_status,beta_welcome_sent_at,beta_access_sent_at,beta_added_at,beta_access_expires_at,beta_expired_at,app_registered_at,app_user_id").not("beta_opt_in_at","is",null).order("beta_opt_in_at",{ascending:false}).limit(500);if(error)throw error;
  const testers=data||[],counts={total:testers.length,pending_add:0,added:0,opted_in:0,declined:0};for(const t of testers){if(t.play_test_status in counts)(counts as any)[t.play_test_status]++}
  return new Response(JSON.stringify({ok:true,counts,testers}),{status:200,headers});
 }catch(e){console.error("ADMIN BETA TESTERS ERROR",e);return new Response(JSON.stringify({error:"server_error"}),{status:500,headers})}
});