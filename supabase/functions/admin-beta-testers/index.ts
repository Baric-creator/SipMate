import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const allowedOrigins = new Set(["https://officialsipmate.com","https://www.officialsipmate.com"]);
const allowedStatuses = new Set(["pending_add","added","opted_in","declined"]);
function cors(origin:string|null){const allow=origin&&allowedOrigins.has(origin)?origin:"https://officialsipmate.com";return {"Access-Control-Allow-Origin":allow,"Access-Control-Allow-Headers":"authorization, apikey, content-type","Access-Control-Allow-Methods":"GET, PATCH, OPTIONS","Vary":"Origin"}}
Deno.serve(async(req)=>{
 const origin=req.headers.get("origin"); const headers={...cors(origin),"Content-Type":"application/json"};
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
 if(origin&&!allowedOrigins.has(origin))return new Response(JSON.stringify({error:"origin_not_allowed"}),{status:403,headers});
 if(!["GET","PATCH"].includes(req.method))return new Response(JSON.stringify({error:"method_not_allowed"}),{status:405,headers});
 try{
  const url=Deno.env.get("SUPABASE_URL"), anon=Deno.env.get("SUPABASE_ANON_KEY"), service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!anon||!service)throw new Error("configuration_error");
  const auth=req.headers.get("authorization")||"";
  const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:userError}=await userClient.auth.getUser();
  if(userError||!user||user.email?.toLowerCase()!=="sipmate.app@gmail.com")return new Response(JSON.stringify({error:"forbidden"}),{status:403,headers});
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  if(req.method==="PATCH"){
    const body=await req.json().catch(()=>({})); const email=String(body.email||"").trim().toLowerCase(); const status=String(body.status||"");
    if(!email||!allowedStatuses.has(status))return new Response(JSON.stringify({error:"invalid_request"}),{status:400,headers});
    const {error}=await admin.from("waitlist").update({play_test_status:status}).eq("email",email).not("beta_opt_in_at","is",null); if(error)throw error;
  }
  const {data,error}=await admin.from("waitlist").select("email,name,locale,source,beta_opt_in_at,play_test_status").not("beta_opt_in_at","is",null).order("beta_opt_in_at",{ascending:false}).limit(500); if(error)throw error;
  const testers=data||[]; const counts={total:testers.length,pending_add:0,added:0,opted_in:0,declined:0}; for(const t of testers){if(t.play_test_status in counts)(counts as any)[t.play_test_status]++}
  return new Response(JSON.stringify({ok:true,counts,testers}),{status:200,headers});
 }catch(e){console.error("ADMIN BETA TESTERS ERROR",e);return new Response(JSON.stringify({error:"server_error"}),{status:500,headers})}
});