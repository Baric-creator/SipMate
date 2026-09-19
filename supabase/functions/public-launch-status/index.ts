import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://officialsipmate.com",
  "https://www.officialsipmate.com",
]);

function headers(origin: string | null) {
  const allow = origin && allowedOrigins.has(origin) ? origin : "https://officialsipmate.com";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json",
    "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
    "Vary": "Origin",
  };
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const h = headers(origin);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
  if (req.method !== "GET") return new Response(JSON.stringify({ ok: false }), { status: 405, headers: h });
  if (origin && !allowedOrigins.has(origin)) return new Response(JSON.stringify({ ok: false }), { status: 403, headers: h });

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !service) throw new Error("config");
    const sb = createClient(url, service, { auth: { persistSession: false } });

    const [
      { count: waitlistCount, error: waitlistError },
      { data: founders, error: foundersError },
      { data: cities, error: citiesError },
      { data: launch, error: launchError }
    ] = await Promise.all([
      sb.from("waitlist").select("id", { count: "exact", head: true }),
      sb.from("premium_offers").select("max_subscribers,subscriber_count").eq("code", "founders_yearly").maybeSingle(),
      sb.from("waitlist").select("city").not("city","is",null),
      sb.from("launch_config")
        .select("phase,play_store_url,maintenance_mode,min_android_version_code,feature_flags,updated_at")
        .eq("id", true)
        .maybeSingle()
    ]);
    if (waitlistError || foundersError || citiesError || launchError) throw waitlistError ?? foundersError ?? citiesError ?? launchError;

    const cityMap = new Map<string, number>();
    const displayName = new Map<string,string>();
    for (const row of cities ?? []) {
      const city = String(row.city ?? "").trim();
      if (!city) continue;
      const key = city.toLocaleLowerCase("en");
      cityMap.set(key, (cityMap.get(key) ?? 0) + 1);
      if (!displayName.has(key)) displayName.set(key, city);
    }

    const topCities = [...cityMap.entries()]
      .filter(([,count]) => count >= 3)
      .sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0]))
      .slice(0,6)
      .map(([key,count])=>({ city: displayName.get(key) ?? key, count }));

    const total = founders?.max_subscribers ?? 100;
    const used = founders?.subscriber_count ?? 0;
    const flags = launch?.feature_flags && typeof launch.feature_flags === "object" ? launch.feature_flags : {};

    return new Response(JSON.stringify({
      ok: true,
      waitlist_count: waitlistCount ?? 0,
      founders: { total, used, remaining: Math.max(total - used, 0) },
      city_demand: topCities,
      city_demand_threshold: 3,
      launch: {
        phase: launch?.phase ?? "waitlist",
        play_store_url: launch?.play_store_url ?? null,
        maintenance_mode: launch?.maintenance_mode === true,
        min_android_version_code: launch?.min_android_version_code ?? 1,
        feature_flags: flags,
        updated_at: launch?.updated_at ?? null
      }
    }), { headers: h });
  } catch {
    return new Response(JSON.stringify({ ok: false }), { status: 500, headers: h });
  }
});