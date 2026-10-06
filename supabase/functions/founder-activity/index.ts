import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "jsr:@supabase/supabase-js@2";
const origins=new Set(["https://officialsipmate.com","https://www.officialsipmate.com"]);
function cors(o:string|null){return {"Access-Control-Allow-Origin":o&&origins.has(o)?o:"https://officialsipmate.com","Access-Control-Allow-Headers":"authorization, apikey, content-type","Access-Control-Allow-Methods":"GET, PATCH, OPTIONS","Vary":"Origin","Content-Type":"application/json"}}
Deno.serve(async(req)=>{
 const o=req.headers.get("origin"),h=cors(o);if(req.method==="OPTIONS")return new Response(null,{status:204,headers:h});if(o&&!origins.has(o))return new Response('{"error":"origin_not_allowed"}',{status:403,headers:h});
 try{
  const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,auth=req.headers.get("authorization")||"";
  const uc=createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}}),{data:{user}}=await uc.auth.getUser();
  if(!user||user.email?.toLowerCase()!=="sipmate.app@gmail.com")return new Response('{"error":"forbidden"}',{status:403,headers:h});
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  if(req.method==="PATCH"){const b=await req.json().catch(()=>({}));if(b.all===true){const {error}=await admin.from("founder_activity").update({read_at:new Date().toISOString()}).is("read_at",null);if(error)throw error}else if(b.id){const {error}=await admin.from("founder_activity").update({read_at:new Date().toISOString()}).eq("id",b.id);if(error)throw error}}
  const {data,error}=await admin.from("founder_activity").select("*").order("created_at",{ascending:false}).limit(100);if(error)throw error;
  const items=data||[],unread=items.filter((x:any)=>!x.read_at).length;
  return new Response(JSON.stringify({ok:true,unread,items}),{headers:h});
 }catch(e){console.error(e);return new Response('{"error":"server_error"}',{status:500,headers:h})}
});