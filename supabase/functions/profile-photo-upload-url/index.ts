import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_EXTENSIONS=new Set(["jpg","png","webp"]);
const OWN_PATH_PATTERN=/^[0-9a-f-]{36}\/gallery-[0-9]+-[a-z0-9]+\.(jpg|png|webp)$/i;

function response(body:unknown,status=200){
  return new Response(JSON.stringify(body),{
    status,
    headers:{"Content-Type":"application/json","Cache-Control":"no-store"},
  });
}

Deno.serve(async(req:Request)=>{
  if(req.method!=="POST")return response({ok:false,error:"method_not_allowed"},405);
  try{
    const supabaseUrl=Deno.env.get("SUPABASE_URL");
    const anonKey=Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRole=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authHeader=req.headers.get("Authorization");
    if(!supabaseUrl||!anonKey||!serviceRole)return response({ok:false,error:"missing_config"},500);
    if(!authHeader)return response({ok:false,error:"unauthorized"},401);

    const token=authHeader.replace(/^Bearer\s+/i,"");
    const auth=createClient(supabaseUrl,anonKey,{auth:{persistSession:false}});
    const {data:userData,error:userError}=await auth.auth.getUser(token);
    const user=userData?.user;
    if(userError||!user)return response({ok:false,error:"unauthorized"},401);

    const body=await req.json().catch(()=>({}));
    const action=String(body?.action||"prepare");
    const admin=createClient(supabaseUrl,serviceRole,{auth:{persistSession:false}});

    const {data:profile,error:profileError}=await admin
      .from("profiles")
      .select("is_premium,premium_until")
      .eq("id",user.id)
      .maybeSingle();
    if(profileError)throw profileError;

    const premiumActive=profile?.is_premium===true &&
      (!profile.premium_until || new Date(profile.premium_until).getTime()>Date.now());
    if(!premiumActive)return response({ok:false,error:"premium_required"},403);

    const {count,error:countError}=await admin
      .from("profile_photos")
      .select("id",{count:"exact",head:true})
      .eq("user_id",user.id);
    if(countError)throw countError;
    if((count??0)>=6)return response({ok:false,error:"gallery_limit"},409);

    if(action==="finalize"){
      const path=String(body?.path||"");
      if(!OWN_PATH_PATTERN.test(path) || !path.startsWith(user.id+"/")){
        return response({ok:false,error:"invalid_path"},400);
      }

      const {data:objects,error:objectError}=await admin.storage.from("avatars").list(user.id,{
        search:path.split("/").pop()||"",
        limit:10,
      });
      if(objectError)throw objectError;
      const fileName=path.split("/").pop()||"";
      if(!(objects??[]).some((item:any)=>item.name===fileName)){
        return response({ok:false,error:"upload_missing"},404);
      }

      const {data:{publicUrl}}=admin.storage.from("avatars").getPublicUrl(path);
      const {data:inserted,error:insertError}=await admin
        .from("profile_photos")
        .insert({
          user_id:user.id,
          photo_url:publicUrl,
          sort_order:count??0,
        })
        .select("id,photo_url,sort_order")
        .single();
      if(insertError)throw insertError;

      return response({ok:true,photo:inserted});
    }

    const extension=String(body?.extension||"").toLowerCase();
    if(!ALLOWED_EXTENSIONS.has(extension))return response({ok:false,error:"unsupported_image_type"},400);

    const suffix=crypto.randomUUID().replaceAll("-","").slice(0,10);
    const path=`${user.id}/gallery-${Date.now()}-${suffix}.${extension}`;
    const {data:signed,error:signedError}=await admin.storage.from("avatars").createSignedUploadUrl(path);
    if(signedError||!signed?.token)throw signedError||new Error("signed_upload_failed");

    return response({ok:true,path,token:signed.token});
  }catch(error){
    console.error("profile-photo-upload-url",error);
    return response({ok:false,error:"server_error"},500);
  }
});
