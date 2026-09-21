import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const PUSH_TIMEOUT_MS=8000;
const COOLDOWN_MS=15*60*1000;

function json(body:unknown,status=200){
  return new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
}
function distanceKm(lat1:number,lon1:number,lat2:number,lon2:number){
  const r=6371;
  const toRad=(v:number)=>v*Math.PI/180;
  const dLat=toRad(lat2-lat1);
  const dLon=toRad(lon2-lon1);
  const a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return 2*r*Math.asin(Math.sqrt(Math.min(1,Math.max(0,a))));
}
function drinkLabel(value:string|null|undefined,lang:string){
  const v=value||"🥂 Drinks";
  const map:Record<string,{en:string,de:string,hr:string}>={
    "🍺 Beer":{en:"beer",de:"Bier",hr:"pivo"},
    "🍹 Cocktail":{en:"a cocktail",de:"einen Cocktail",hr:"koktel"},
    "🍸 Cocktail":{en:"a cocktail",de:"einen Cocktail",hr:"koktel"},
    "🍷 Wine":{en:"wine",de:"Wein",hr:"vino"},
    "🥃 Whisky":{en:"whisky",de:"Whisky",hr:"viski"},
    "☕ Coffee":{en:"coffee",de:"Kaffee",hr:"kavu"},
    "🥂 Drinks":{en:"drinks",de:"Drinks",hr:"piće"},
    "🎉 Hangout":{en:"a hangout",de:"Leute treffen",hr:"druženje"},
  };
  return map[v]?.[lang as "en"|"de"|"hr"]??v;
}
function distanceLabel(km:number,lang:string){
  if(km<1){
    const meters=Math.max(100,Math.round(km*1000/100)*100);
    return `${meters} m`;
  }
  const formatted=(Math.round(km*10)/10).toFixed(1).replace(".",lang==="de"||lang==="hr"?",":".");
  return `${formatted} km`;
}
function bodyText(name:string,km:number,drink:string,lang:string){
  const d=distanceLabel(km,lang);
  if(lang==="de")return `${name} ist ${d} entfernt und hat Lust auf ${drink}.`;
  if(lang==="hr")return `${name} je ${d} od tebe i želi ${drink}.`;
  return `${name} is ${d} away and is up for ${drink}.`;
}

Deno.serve(async(req:Request)=>{
  if(req.method!=="POST")return json({ok:false,error:"method_not_allowed"},405);
  try{
    const supabaseUrl=Deno.env.get("SUPABASE_URL");
    const anonKey=Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRole=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authHeader=req.headers.get("Authorization");
    if(!supabaseUrl||!anonKey||!serviceRole)return json({ok:false,error:"missing_config"},500);
    if(!authHeader)return json({ok:false,error:"unauthorized"},401);

    const token=authHeader.replace(/^Bearer\s+/i,"");
    const auth=createClient(supabaseUrl,anonKey,{auth:{persistSession:false}});
    const {data:userData,error:userError}=await auth.auth.getUser(token);
    const user=userData?.user;
    if(userError||!user)return json({ok:false,error:"unauthorized"},401);

    const admin=createClient(supabaseUrl,serviceRole,{auth:{persistSession:false}});
    const {data:sender,error:senderError}=await admin.from("profiles")
      .select("id,name,latitude,longitude,currently_up_for,is_active,active_until")
      .eq("id",user.id).maybeSingle();
    if(senderError)throw senderError;
    if(!sender||sender.is_active!==true||!sender.active_until||new Date(sender.active_until).getTime()<=Date.now()){
      return json({ok:true,skipped:"sender_inactive"});
    }
    if(sender.latitude==null||sender.longitude==null)return json({ok:true,skipped:"sender_location_missing"});

    const activityKey=[
      sender.currently_up_for||"",
      Number(sender.latitude).toFixed(3),
      Number(sender.longitude).toFixed(3),
    ].join("|");

    const cutoff=new Date(Date.now()-COOLDOWN_MS).toISOString();
    const {data:recent}=await admin.from("nearby_notification_events")
      .select("id").eq("sender_id",user.id).eq("activity_key",activityKey).gte("created_at",cutoff).limit(1);
    if((recent??[]).length)return json({ok:true,skipped:"cooldown"});

    const [{data:profiles,error:profilesError},{data:blocks,error:blocksError}]=await Promise.all([
      admin.from("profiles")
        .select("id,preferred_language,latitude,longitude,nearby_notify_radius_km,notify_nearby,is_active,active_until")
        .neq("id",user.id)
        .eq("notify_nearby",true)
        .eq("is_active",true)
        .not("latitude","is",null)
        .not("longitude","is",null),
      admin.from("blocks")
        .select("blocker_id,blocked_id")
        .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`),
    ]);
    if(profilesError)throw profilesError;
    if(blocksError)throw blocksError;

    const blockedIds=new Set<string>();
    for(const row of blocks??[]){
      const other=row.blocker_id===user.id?row.blocked_id:row.blocker_id;
      if(other)blockedIds.add(String(other));
    }

    const recipients=(profiles??[]).map((p:any)=>{
      if(blockedIds.has(String(p.id)))return null;
      if(!p.active_until||new Date(p.active_until).getTime()<=Date.now())return null;
      const km=distanceKm(Number(sender.latitude),Number(sender.longitude),Number(p.latitude),Number(p.longitude));
      const radius=Number(p.nearby_notify_radius_km||10);
      return km<=radius?{...p,km}:null;
    }).filter(Boolean) as any[];

    if(!recipients.length){
      await admin.from("nearby_notification_events").insert({sender_id:user.id,activity_key:activityKey,recipient_count:0});
      return json({ok:true,recipients:0});
    }

    const recipientIds=recipients.map((r)=>r.id);
    const {data:tokenRows,error:tokenError}=await admin.from("device_push_tokens")
      .select("user_id,token").in("user_id",recipientIds);
    if(tokenError)throw tokenError;

    const recipientMap=new Map(recipients.map((r)=>[String(r.id),r]));
    const senderName=sender.name||"SipMate";
    const payload=(tokenRows??[]).map((row:any)=>{
      const recipient=recipientMap.get(String(row.user_id));
      if(!recipient)return null;
      const lang=["de","hr"].includes(recipient.preferred_language)?recipient.preferred_language:"en";
      return {
        to:row.token,
        sound:"default",
        channelId:"nearby",
        title:"🍻 SipMate Nearby",
        body:bodyText(senderName,recipient.km,drinkLabel(sender.currently_up_for,lang),lang),
        data:{type:"nearby_activity",id:user.id},
        priority:"high",
      };
    }).filter(Boolean);

    let result:any={};
    if(payload.length){
      const pushResponse=await fetch("https://exp.host/--/api/v2/push/send",{
        method:"POST",
        headers:{"Content-Type":"application/json","Accept":"application/json","Accept-Encoding":"gzip, deflate"},
        body:JSON.stringify(payload),
        signal:AbortSignal.timeout(PUSH_TIMEOUT_MS),
      });
      result=await pushResponse.json().catch(()=>({}));
      if(!pushResponse.ok)return json({ok:false,error:"push_failed"},502);
    }

    await admin.from("nearby_notification_events").insert({
      sender_id:user.id,activity_key:activityKey,recipient_count:recipients.length
    });

    return json({ok:true,recipients:recipients.length,tickets:payload.length,result});
  }catch(error){
    console.error("send-nearby-activity-notification",error);
    return json({ok:false,error:"server_error"},500);
  }
});
