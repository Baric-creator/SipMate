import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_ORIGINS=new Set(["https://officialsipmate.com","https://www.officialsipmate.com"]);

function cors(origin:string|null){
  const allow=origin&&ALLOWED_ORIGINS.has(origin)?origin:"https://officialsipmate.com";
  return {
    "Access-Control-Allow-Origin":allow,
    "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods":"POST, OPTIONS",
    "Content-Type":"application/json",
    "Cache-Control":"no-store",
    "Vary":"Origin",
  };
}
function json(body:unknown,status:number,headers:Record<string,string>){
  return new Response(JSON.stringify(body),{status,headers});
}

Deno.serve(async(req:Request)=>{
  const origin=req.headers.get("origin");
  const headers=cors(origin);
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
  if(req.method!=="POST")return json({ok:false,error:"method_not_allowed"},405,headers);
  if(origin&&!ALLOWED_ORIGINS.has(origin))return json({ok:false,error:"origin_not_allowed"},403,headers);

  try{
    const url=Deno.env.get("SUPABASE_URL");
    const anon=Deno.env.get("SUPABASE_ANON_KEY");
    const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if(!url||!anon||!service)throw new Error("missing_config");

    const token=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");
    if(!token)return json({ok:false,error:"unauthorized"},401,headers);

    const auth=createClient(url,anon,{auth:{persistSession:false}});
    const {data:userData,error:userError}=await auth.auth.getUser(token);
    const user=userData?.user;
    if(userError||!user)return json({ok:false,error:"unauthorized"},401,headers);

    const body=await req.json().catch(()=>({}));
    const messageId=String(body?.messageId||"").trim();
    if(!UUID_RE.test(messageId))return json({ok:false,error:"invalid_request"},400,headers);

    const sb=createClient(url,service,{auth:{persistSession:false}});
    const {data:message,error:messageError}=await sb
      .from("messages")
      .select("id,sender_id,message_type,image_path")
      .eq("id",messageId)
      .maybeSingle();

    if(messageError)throw messageError;
    if(!message||message.message_type!=="image")return json({ok:false,error:"not_found"},404,headers);
    if(message.sender_id!==user.id)return json({ok:false,error:"forbidden"},403,headers);

    if(message.image_path){
      const {error:storageError}=await sb.storage.from("chat-images").remove([message.image_path]);
      if(storageError)throw storageError;
    }

    const {error:deleteError}=await sb.from("messages").delete().eq("id",messageId).eq("sender_id",user.id);
    if(deleteError)throw deleteError;

    return json({ok:true,messageId},200,headers);
  }catch(error){
    console.error("delete-chat-image",error);
    return json({ok:false,error:"server_error"},500,headers);
  }
});
