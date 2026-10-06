import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
const origins=new Set(["https://officialsipmate.com","https://www.officialsipmate.com"]);
const cors=(o:string|null)=>({"Access-Control-Allow-Origin":o&&origins.has(o)?o:"https://officialsipmate.com","Access-Control-Allow-Headers":"authorization, apikey, content-type","Access-Control-Allow-Methods":"GET, POST, DELETE, OPTIONS","Vary":"Origin"});
Deno.serve(async(req)=>{
 const origin=req.headers.get("origin"),headers={...cors(origin),"Content-Type":"application/json"};
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
 if(origin&&!origins.has(origin))return new Response(JSON.stringify({error:"origin_not_allowed"}),{status:403,headers});
 try{
  const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const auth=req.headers.get("authorization")||"",client=createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error}=await client.auth.getUser();
  if(error||!user||user.email?.toLowerCase()!=="sipmate.app@gmail.com")return new Response(JSON.stringify({error:"forbidden"}),{status:403,headers});
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:keyRow,error:keyErr}=await admin.schema("vault").from("decrypted_secrets").select("decrypted_secret").eq("name","FOUNDER_VAPID_PUBLIC_KEY").maybeSingle();
  if(keyErr||!keyRow?.decrypted_secret)throw keyErr||new Error("push_key_missing");
  if(req.method==="GET")return new Response(JSON.stringify({ok:true,public_key:keyRow.decrypted_secret}),{headers});
  const body=await req.json().catch(()=>({})),endpoint=String(body?.endpoint||"");
  if(!endpoint.startsWith("https://"))return new Response(JSON.stringify({error:"invalid_subscription"}),{status:400,headers});
  if(req.method==="DELETE"){await admin.from("founder_push_subscriptions").delete().eq("endpoint",endpoint);return new Response(JSON.stringify({ok:true}),{headers});}
  if(req.method!=="POST")return new Response(JSON.stringify({error:"method_not_allowed"}),{status:405,headers});
  const p256dh=String(body?.keys?.p256dh||""),authKey=String(body?.keys?.auth||"");if(!p256dh||!authKey)return new Response(JSON.stringify({error:"invalid_subscription"}),{status:400,headers});
  const {error:upErr}=await admin.from("founder_push_subscriptions").upsert({endpoint,p256dh,auth:authKey,user_agent:req.headers.get("user-agent"),updated_at:new Date().toISOString()},{onConflict:"endpoint"});if(upErr)throw upErr;
  return new Response(JSON.stringify({ok:true}),{headers});
 }catch(e){console.error("FOUNDER PUSH SUBSCRIPTION ERROR",e);return new Response(JSON.stringify({error:"server_error"}),{status:500,headers})}
});