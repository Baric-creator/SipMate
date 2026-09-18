import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set([
  "https://officialsipmate.com",
  "https://www.officialsipmate.com",
]);
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
function json(body:unknown,status:number,headers:Record<string,string>){
  return new Response(JSON.stringify(body),{status,headers});
}
Deno.serve(async(req:Request)=>{
  const origin=req.headers.get("origin");const headers=cors(origin);
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
  if(req.method!=="POST")return json({ok:false,error:"method_not_allowed"},405,headers);
  if(origin&&!ALLOWED_ORIGINS.has(origin))return json({ok:false,error:"origin_not_allowed"},403,headers);
  try{
    const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if(!url||!anon||!service)throw new Error("missing_config");
    const token=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");
    if(!token)return json({ok:false,error:"unauthorized"},401,headers);
    const auth=createClient(url,anon,{auth:{persistSession:false}});
    const {data:userData,error:userError}=await auth.auth.getUser(token);
    const user=userData?.user;if(userError||!user)return json({ok:false,error:"unauthorized"},401,headers);
    const body=await req.json().catch(()=>({}));const messageId=String(body?.messageId||"").trim();
    if(!messageId)return json({ok:false,error:"invalid_request"},400,headers);
    const sb=createClient(url,service,{auth:{persistSession:false}});
    const {data:message,error:messageError}=await sb.from("messages")
      .select("id,conversation_id,message_type,image_path,image_moderation_status")
      .eq("id",messageId).maybeSingle();
    if(messageError)throw messageError;
    if(!message||message.message_type!=="image"||message.image_moderation_status!=="approved"||!message.image_path){
      return json({ok:false,error:"not_found"},404,headers);
    }
    const {data:conversation,error:conversationError}=await sb.from("conversations")
      .select("user_one,user_two").eq("id",message.conversation_id).maybeSingle();
    if(conversationError)throw conversationError;
    if(!conversation||(conversation.user_one!==user.id&&conversation.user_two!==user.id)){
      return json({ok:false,error:"forbidden"},403,headers);
    }
    const otherId=conversation.user_one===user.id?conversation.user_two:conversation.user_one;
    const {data:blockState,error:blockError}=await sb.rpc("is_blocked_between",{user_a:user.id,user_b:otherId});
    if(blockError)throw blockError;
    if(blockState)return json({ok:false,error:"blocked"},403,headers);
    const {data:signed,error:signedError}=await sb.storage.from("chat-images").createSignedUrl(message.image_path,300);
    if(signedError||!signed?.signedUrl)throw signedError||new Error("signed_url_failed");
    return json({ok:true,url:signed.signedUrl,expires_in:300},200,headers);
  }catch(error){console.error("chat-image-url",error);return json({ok:false,error:"server_error"},500,headers);}
});