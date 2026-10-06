import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "jsr:@supabase/supabase-js@2";
const origins=new Set(["https://officialsipmate.com","https://www.officialsipmate.com"]);
const copy:any={
 en:{subject:"Your SipMate report has been resolved ✅",title:"Report resolved.",body:"Thanks for reporting the problem. Your report has been reviewed and marked as resolved. Your feedback helps us make SipMate better.",note:"Message from SipMate"},
 de:{subject:"Deine SipMate-Meldung wurde gelöst ✅",title:"Meldung gelöst.",body:"Danke, dass du uns das Problem gemeldet hast. Deine Meldung wurde geprüft und als gelöst markiert. Dein Feedback hilft uns, SipMate besser zu machen.",note:"Nachricht von SipMate"},
 hr:{subject:"Tvoj SipMate report je riješen ✅",title:"Report je riješen.",body:"Hvala što si nam prijavio/la problem. Tvoja prijava je pregledana i označena kao riješena. Tvoj feedback nam pomaže da SipMate bude bolji.",note:"Poruka od SipMatea"}
};
const esc=(s:string)=>s.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
Deno.serve(async(req)=>{
 const o=req.headers.get("origin"),h={"Access-Control-Allow-Origin":o&&origins.has(o)?o:"https://officialsipmate.com","Access-Control-Allow-Headers":"authorization, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json","Vary":"Origin"};
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:h});if(o&&!origins.has(o))return new Response('{"error":"origin"}',{status:403,headers:h});
 try{
  const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,auth=req.headers.get("authorization")||"";
  const uc=createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}}),{data:{user}}=await uc.auth.getUser();if(!user||user.email?.toLowerCase()!=="sipmate.app@gmail.com")return new Response('{"error":"forbidden"}',{status:403,headers:h});
  const b=await req.json(),id=String(b.id||""),note=String(b.note||"").trim().slice(0,1000);if(!id)return new Response('{"error":"invalid"}',{status:400,headers:h});
  const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:f,error}=await db.from("app_feedback").select("id,user_id,status,resolution_email_sent_at").eq("id",id).maybeSingle();if(error||!f)return new Response('{"error":"not_found"}',{status:404,headers:h});
  if(f.resolution_email_sent_at)return new Response(JSON.stringify({ok:true,already_sent:true}),{headers:h});
  const {data:u,error:ue}=await db.auth.admin.getUserById(f.user_id);if(ue||!u?.user?.email)throw new Error("user_email_not_found");
  const {data:p}=await db.from("profiles").select("name,preferred_language").eq("id",f.user_id).maybeSingle(),lang=["en","de","hr"].includes(p?.preferred_language)?p.preferred_language:"en",t=copy[lang],name=String(p?.name||"").trim();
  const key=Deno.env.get("RESEND_API_KEY"),from=Deno.env.get("RESEND_FROM_EMAIL");if(!key||!from)throw new Error("email_config");
  const html=`<!doctype html><html><body style="margin:0;background:#080808;color:#f5f5f4;font-family:Arial,sans-serif;padding:28px"><div style="max-width:580px;margin:auto;background:#141416;border:1px solid #29292e;border-radius:22px;padding:30px"><div style="color:#ff3b30;font-weight:900">SIPMATE SUPPORT 🍻</div><h1>${esc(t.title)}${name?" "+esc(name):""}</h1><p style="line-height:1.65;color:#d4d4d8">${esc(t.body)}</p>${note?`<div style="margin-top:20px;padding:16px;border-radius:14px;background:#0d0d0f;border:1px solid #303036"><b>${esc(t.note)}</b><p style="line-height:1.6;color:#d4d4d8">${esc(note)}</p></div>`:""}<p style="margin-top:26px;color:#8d8d95;font-size:12px">SipMate · Social, not dating.</p></div></body></html>`;
  const rr=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({from,to:[u.user.email],subject:t.subject,html}),signal:AbortSignal.timeout(8000)});if(!rr.ok)throw new Error("email_failed");
  const now=new Date().toISOString();await db.from("app_feedback").update({status:"resolved",reviewed_at:now,resolution_note:note||null,resolution_email_sent_at:now}).eq("id",id).is("resolution_email_sent_at",null);
  return new Response(JSON.stringify({ok:true}),{headers:h});
 }catch(e){console.error("RESOLVE FEEDBACK EMAIL",e);return new Response('{"error":"server_error"}',{status:500,headers:h})}
});