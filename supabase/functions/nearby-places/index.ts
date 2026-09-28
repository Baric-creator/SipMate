import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

type PlaceCategory = "bar" | "pub" | "cafe" | "nightclub" | "biergarten" | "restaurant";
type RequestBody = { latitude?: number; longitude?: number; radiusMeters?: number; categories?: PlaceCategory[] };
type Place = { id: string; name: string; category: PlaceCategory; latitude: number; longitude: number; address: string | null; openingHours: string | null; website: string | null; source: "openstreetmap" };

const ALLOWED_CATEGORIES = new Set<PlaceCategory>(["bar","pub","cafe","nightclub","biergarten","restaurant"]);
const DEFAULT_RADIUS = 3000;
const MAX_RADIUS = 5000;
const CACHE_TTL_MS = 20 * 60 * 1000;
const STALE_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_RESULTS = 60;
const BUCKET_STEP = 0.01;
const BUCKET_PADDING_METERS = 900;
const DEFAULT_OVERPASS_PROVIDERS = [
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass.openstreetmap.jp/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];
const USER_AGENT = "SipMate-Spots/1.0 (+https://officialsipmate.com; contact: sipmate.app@gmail.com)";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
function clampRadius(value?: number) { const n = Number.isFinite(value) ? Number(value) : DEFAULT_RADIUS; return Math.max(500, Math.min(MAX_RADIUS, Math.round(n))); }
function roundBucket(value: number) { return Math.round(value / BUCKET_STEP) * BUCKET_STEP; }
function toRadians(value: number) { return value * Math.PI / 180; }
function distanceMeters(aLat:number,aLon:number,bLat:number,bLon:number){ const r=6371000; const dLat=toRadians(bLat-aLat); const dLon=toRadians(bLon-aLon); const l1=toRadians(aLat); const l2=toRadians(bLat); const s1=Math.sin(dLat/2); const s2=Math.sin(dLon/2); const v=s1*s1+Math.cos(l1)*Math.cos(l2)*s2*s2; return Math.round(r*2*Math.atan2(Math.sqrt(v),Math.sqrt(1-v))); }
function categoryForTags(tags:Record<string,string>|undefined):PlaceCategory|null { const a=tags?.amenity; if(a==="bar"||a==="pub"||a==="cafe"||a==="nightclub"||a==="biergarten"||a==="restaurant") return a; if(tags?.leisure==="beer_garden") return "biergarten"; return null; }
function addressForTags(tags:Record<string,string>|undefined){ if(!tags) return null; const street=[tags["addr:street"],tags["addr:housenumber"]].filter(Boolean).join(" "); const city=tags["addr:city"]||tags["addr:town"]||tags["addr:village"]||""; const parts=[street,tags["addr:postcode"],city].filter(Boolean); return parts.length?parts.join(", "):null; }
function websiteForTags(tags:Record<string,string>|undefined){ return tags?.website||tags?.["contact:website"]||null; }
function buildOverpassQuery(lat:number,lon:number,radius:number,categories:PlaceCategory[]){ const parts:string[]=[]; for(const c of categories.filter(c=>c!=="biergarten")) parts.push(`nwr["amenity"="${c}"](around:${radius},${lat},${lon});`); if(categories.includes("biergarten")){ parts.push(`nwr["amenity"="biergarten"](around:${radius},${lat},${lon});`); parts.push(`nwr["leisure"="beer_garden"](around:${radius},${lat},${lon});`); } return `[out:json][timeout:15];(${parts.join("")});out center tags;`; }

async function fetchOverpass(query:string){
  const configured=Deno.env.get("PLACES_OVERPASS_URL")?.trim();
  const providers=configured?[configured,...DEFAULT_OVERPASS_PROVIDERS.filter(u=>u!==configured)]:DEFAULT_OVERPASS_PROVIDERS;
  let lastError:unknown=null;
  for(const provider of providers){
    try{
      const res=await fetch(provider,{ method:"POST", headers:{
        "Accept":"application/json",
        "Content-Type":"application/x-www-form-urlencoded;charset=UTF-8",
        "User-Agent":USER_AGENT,
        "From":"sipmate.app@gmail.com",
        "Referer":"https://officialsipmate.com/"
      }, body:new URLSearchParams({data:query}).toString(), signal:AbortSignal.timeout(12_000) });
      if(!res.ok){ const body=await res.text().catch(()=>""); console.error("nearby-places provider",provider,res.status,body.slice(0,300)); lastError=new Error(`provider_${res.status}`); continue; }
      const data=await res.json();
      if(!Array.isArray(data?.elements)){ console.error("nearby-places invalid payload",provider); lastError=new Error("provider_invalid_payload"); continue; }
      console.log("nearby-places provider ok",provider,"elements",data.elements.length);
      return data;
    }catch(error){ console.error("nearby-places provider request",provider,error); lastError=error; }
  }
  throw lastError??new Error("provider_unavailable");
}

Deno.serve(async(req:Request)=>{
  if(req.method!=="POST") return json({ok:false,error:"method_not_allowed"},405);
  try{
    const supabaseUrl=Deno.env.get("SUPABASE_URL"); const anonKey=Deno.env.get("SUPABASE_ANON_KEY"); const serviceRole=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"); const authHeader=req.headers.get("Authorization");
    if(!supabaseUrl||!anonKey||!serviceRole) return json({ok:false,error:"missing_config"},500);
    if(!authHeader) return json({ok:false,error:"unauthorized"},401);
    const token=authHeader.replace(/^Bearer\s+/i,"");
    const auth=createClient(supabaseUrl,anonKey,{auth:{persistSession:false}});
    const {data:userData,error:userError}=await auth.auth.getUser(token);
    if(userError||!userData.user) return json({ok:false,error:"unauthorized"},401);
    const userClient=createClient(supabaseUrl,anonKey,{global:{headers:{Authorization:authHeader}},auth:{persistSession:false}});
    const {data:rows,error:entitlementError}=await userClient.rpc("get_my_premium_entitlement");
    if(entitlementError) return json({ok:false,error:"premium_check_failed"},500);
    const entitlement:any=Array.isArray(rows)?rows[0]:rows;
    const premiumActive=entitlement?.is_premium===true&&(!entitlement?.premium_until||new Date(entitlement.premium_until).getTime()>Date.now());
    if(!premiumActive) return json({ok:false,error:"premium_required"},403);
    const body:RequestBody=await req.json().catch(()=>({})); const latitude=Number(body.latitude); const longitude=Number(body.longitude);
    if(!Number.isFinite(latitude)||latitude<-90||latitude>90||!Number.isFinite(longitude)||longitude<-180||longitude>180) return json({ok:false,error:"invalid_coordinates"},400);
    const radiusMeters=clampRadius(body.radiusMeters);
    const requested=Array.isArray(body.categories)&&body.categories.length?body.categories.filter((c):c is PlaceCategory=>ALLOWED_CATEGORIES.has(c)):Array.from(ALLOWED_CATEGORIES);
    if(!requested.length) return json({ok:false,error:"invalid_categories"},400);
    const bucketLatitude=roundBucket(latitude); const bucketLongitude=roundBucket(longitude); const normalized=[...requested].sort();
    const cacheKey=[bucketLatitude.toFixed(2),bucketLongitude.toFixed(2),radiusMeters,normalized.join(",")].join(":");
    const admin=createClient(supabaseUrl,serviceRole,{auth:{persistSession:false}}); const now=Date.now();
    const {data:cached}=await admin.from("places_cache").select("payload,expires_at").eq("cache_key",cacheKey).maybeSingle();
    const cachedPayload=cached?.payload&&Array.isArray(cached.payload)?cached.payload as Place[]:null; const expires=cached?.expires_at?new Date(cached.expires_at).getTime():0;
    let places:Place[]=[]; let fromCache=false; let staleCache=false;
    if(cachedPayload&&expires>now){ places=cachedPayload; fromCache=true; }
    else{
      try{
        const data=await fetchOverpass(buildOverpassQuery(bucketLatitude,bucketLongitude,Math.min(MAX_RADIUS+BUCKET_PADDING_METERS,radiusMeters+BUCKET_PADDING_METERS),normalized));
        const seen=new Set<string>();
        for(const e of data.elements??[]){ const category=categoryForTags(e.tags); if(!category||!normalized.includes(category)) continue; const lat=Number(e.lat??e.center?.lat); const lon=Number(e.lon??e.center?.lon); const name=String(e.tags?.name||"").trim(); if(!Number.isFinite(lat)||!Number.isFinite(lon)||!name) continue; const id=`${e.type}-${e.id}`; if(seen.has(id)) continue; seen.add(id); places.push({id,name,category,latitude:lat,longitude:lon,address:addressForTags(e.tags),openingHours:e.tags?.opening_hours||null,website:websiteForTags(e.tags),source:"openstreetmap"}); }
        console.log("nearby-places parsed",places.length,"for",bucketLatitude,bucketLongitude,"radius",radiusMeters);
        await admin.from("places_cache").upsert({cache_key:cacheKey,payload:places,expires_at:new Date(now+CACHE_TTL_MS).toISOString()});
      }catch(error){ console.error("nearby-places all providers failed",error); if(cachedPayload&&expires>now-STALE_CACHE_MAX_AGE_MS){ places=cachedPayload; fromCache=true; staleCache=true; } else return json({ok:false,error:"provider_unavailable"},502); }
    }
    const results=places.map(p=>({...p,distanceMeters:distanceMeters(latitude,longitude,p.latitude,p.longitude)})).filter(p=>p.distanceMeters<=radiusMeters).sort((a,b)=>a.distanceMeters-b.distanceMeters).slice(0,MAX_RESULTS);
    console.log("nearby-places results",results.length,"fromCache",fromCache,"stale",staleCache);
    return json({ok:true,places:results,radiusMeters,fromCache,staleCache,attribution:"© OpenStreetMap contributors"});
  }catch(error){ console.error("nearby-places",error); return json({ok:false,error:"server_error"},500); }
});
