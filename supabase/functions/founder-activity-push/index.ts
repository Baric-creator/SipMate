import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
const PUB="BDbHX9DzFahJzGGV8n3MUvD78ONVXped35gYCFW-bcfB5waWMUBISNU1aETAMYalubnzsAcaT2he_rTXY_eo2Hk";
Deno.serve(async(req)=>{
 if(req.method!=="POST")return new Response("method",{status:405});
 try{
  const url=Deno.env.get("SUPABASE_URL")!,key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const b=await req.json(),record=b.record||{},type=String(record.event_type||"");
  if(!["user_registered","app_feedback","moderation_report"].includes(type))return new Response("ok");
  const {data:cfg}=await db.from("founder_push_config").select("vapid_private_key").eq("id",true).maybeSingle();if(!cfg?.vapid_private_key)return new Response("ok");
  const {data:subs}=await db.from("founder_push_subscriptions").select("endpoint,p256dh,auth");if(!subs?.length)return new Response("ok");
  webpush.setVapidDetails("mailto:sipmate.app@gmail.com",PUB,cfg.vapid_private_key);
  const payload=JSON.stringify({title:record.title||"SipMate Founder",body:record.body||"New founder activity",url:record.target_url||"/admin.html?tab=activity",tag:"sipmate-"+type,priority:type==="moderation_report"?"high":"normal"});
  for(const s of subs){try{await webpush.sendNotification({endpoint:s.endpoint,keys:{p256dh:s.p256dh,auth:s.auth}},payload,{TTL:300,urgency:type==="moderation_report"?"high":"normal"})}catch(e:any){const st=e?.statusCode||e?.status;if(st===404||st===410)await db.from("founder_push_subscriptions").delete().eq("endpoint",s.endpoint);else console.error("ACTIVITY PUSH",st||e)}}
  return new Response("ok");
 }catch(e){console.error("ACTIVITY PUSH ERROR",e);return new Response("error",{status:500})}
});