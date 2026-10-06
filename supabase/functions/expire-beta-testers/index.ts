import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
Deno.serve(async(req)=>{
 if(req.method!=="POST")return new Response(JSON.stringify({error:"method_not_allowed"}),{status:405,headers:{"Content-Type":"application/json"}});
 const secret=Deno.env.get("CRON_SECRET"),given=req.headers.get("x-cron-secret");if(secret&&given!==secret)return new Response(JSON.stringify({error:"forbidden"}),{status:403,headers:{"Content-Type":"application/json"}});
 try{
  const url=Deno.env.get("SUPABASE_URL")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const now=new Date().toISOString();
  const {data:rows,error}=await admin.from("waitlist").select("id,email,app_registered_at,app_user_id,beta_access_expires_at").eq("play_test_status","added").is("beta_expired_at",null).lte("beta_access_expires_at",now).limit(500);if(error)throw error;
  let expired=0,kept=0;
  for(const row of rows||[]){
   if(row.app_registered_at||row.app_user_id){kept++;continue}
   const {error:u}=await admin.from("waitlist").update({play_test_status:"declined",beta_expired_at:now}).eq("id",row.id).eq("play_test_status","added").is("beta_expired_at",null);if(!u)expired++;else console.error("BETA EXPIRY UPDATE ERROR",u);
  }
  return new Response(JSON.stringify({ok:true,checked:(rows||[]).length,expired,registered_kept:kept}),{headers:{"Content-Type":"application/json"}});
 }catch(e){console.error("BETA EXPIRY ERROR",e);return new Response(JSON.stringify({error:"server_error"}),{status:500,headers:{"Content-Type":"application/json"}})}
});