import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

type PlaceCategory = "bar" | "pub" | "cafe" | "nightclub" | "biergarten" | "restaurant";

type RequestBody = {
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  categories?: PlaceCategory[];
};

type Place = {
  id: string;
  name: string;
  category: PlaceCategory;
  latitude: number;
  longitude: number;
  address: string | null;
  openingHours: string | null;
  website: string | null;
  source: "openstreetmap";
};

const ALLOWED_CATEGORIES = new Set<PlaceCategory>([
  "bar",
  "pub",
  "cafe",
  "nightclub",
  "biergarten",
  "restaurant",
]);

const DEFAULT_RADIUS = 3000;
const MAX_RADIUS = 5000;
const CACHE_TTL_MS = 20 * 60 * 1000;
const MAX_RESULTS = 60;
const BUCKET_STEP = 0.01;
const BUCKET_PADDING_METERS = 900;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function clampRadius(value?: number) {
  const parsed = Number.isFinite(value) ? Number(value) : DEFAULT_RADIUS;
  return Math.max(500, Math.min(MAX_RADIUS, Math.round(parsed)));
}

function roundBucket(value: number) {
  return Math.round(value / BUCKET_STEP) * BUCKET_STEP;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function distanceMeters(aLat: number, aLon: number, bLat: number, bLon: number) {
  const earthRadius = 6_371_000;
  const latDelta = toRadians(bLat - aLat);
  const lonDelta = toRadians(bLon - aLon);
  const lat1 = toRadians(aLat);
  const lat2 = toRadians(bLat);
  const sinLat = Math.sin(latDelta / 2);
  const sinLon = Math.sin(lonDelta / 2);
  const value = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  return Math.round(earthRadius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value)));
}

function categoryForTags(tags: Record<string, string> | undefined): PlaceCategory | null {
  const amenity = tags?.amenity;
  if (amenity === "bar") return "bar";
  if (amenity === "pub") return "pub";
  if (amenity === "cafe") return "cafe";
  if (amenity === "nightclub") return "nightclub";
  if (amenity === "biergarten") return "biergarten";
  if (amenity === "restaurant") return "restaurant";
  if (tags?.leisure === "beer_garden") return "biergarten";
  return null;
}

function addressForTags(tags: Record<string, string> | undefined) {
  if (!tags) return null;
  const street = [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" ");
  const city = tags["addr:city"] || tags["addr:town"] || tags["addr:village"] || "";
  const parts = [street, tags["addr:postcode"], city].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

function websiteForTags(tags: Record<string, string> | undefined) {
  return tags?.website || tags?.["contact:website"] || null;
}

function buildOverpassQuery(latitude: number, longitude: number, radius: number, categories: PlaceCategory[]) {
  const amenityValues = categories
    .filter((category) => category !== "biergarten")
    .map((category) => category === "nightclub" ? "nightclub" : category);

  const parts: string[] = [];
  for (const amenity of amenityValues) {
    parts.push(`nwr["amenity"="${amenity}"](around:${radius},${latitude},${longitude});`);
  }
  if (categories.includes("biergarten")) {
    parts.push(`nwr["amenity"="biergarten"](around:${radius},${latitude},${longitude});`);
    parts.push(`nwr["leisure"="beer_garden"](around:${radius},${latitude},${longitude});`);
  }

  return `[out:json][timeout:20];(${parts.join("")});out center tags;`;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const providerUrl = Deno.env.get("PLACES_OVERPASS_URL") || "https://overpass-api.de/api/interpreter";
    const authHeader = req.headers.get("Authorization");

    if (!supabaseUrl || !anonKey || !serviceRole) return json({ ok: false, error: "missing_config" }, 500);
    if (!authHeader) return json({ ok: false, error: "unauthorized" }, 401);

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const auth = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
    const { data: userData, error: userError } = await auth.auth.getUser(token);
    if (userError || !userData.user) return json({ ok: false, error: "unauthorized" }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: entitlementRows, error: entitlementError } = await userClient.rpc("get_my_premium_entitlement");
    if (entitlementError) return json({ ok: false, error: "premium_check_failed" }, 500);
    const entitlement: any = Array.isArray(entitlementRows) ? entitlementRows[0] : entitlementRows;
    const premiumActive = entitlement?.is_premium === true &&
      (!entitlement?.premium_until || new Date(entitlement.premium_until).getTime() > Date.now());
    if (!premiumActive) return json({ ok: false, error: "premium_required" }, 403);

    const body: RequestBody = await req.json().catch(() => ({}));
    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
        !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return json({ ok: false, error: "invalid_coordinates" }, 400);
    }

    const radiusMeters = clampRadius(body.radiusMeters);
    const requestedCategories = Array.isArray(body.categories) && body.categories.length
      ? body.categories.filter((category): category is PlaceCategory => ALLOWED_CATEGORIES.has(category))
      : Array.from(ALLOWED_CATEGORIES);
    if (!requestedCategories.length) return json({ ok: false, error: "invalid_categories" }, 400);

    const bucketLatitude = roundBucket(latitude);
    const bucketLongitude = roundBucket(longitude);
    const normalizedCategories = [...requestedCategories].sort();
    const cacheKey = [
      bucketLatitude.toFixed(2),
      bucketLongitude.toFixed(2),
      radiusMeters,
      normalizedCategories.join(","),
    ].join(":");

    const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
    const nowIso = new Date().toISOString();
    const { data: cached } = await admin
      .from("places_cache")
      .select("payload,expires_at")
      .eq("cache_key", cacheKey)
      .gt("expires_at", nowIso)
      .maybeSingle();

    let places: Place[];
    let fromCache = false;

    if (cached?.payload && Array.isArray(cached.payload)) {
      places = cached.payload as Place[];
      fromCache = true;
    } else {
      const queryRadius = Math.min(MAX_RADIUS + BUCKET_PADDING_METERS, radiusMeters + BUCKET_PADDING_METERS);
      const query = buildOverpassQuery(bucketLatitude, bucketLongitude, queryRadius, normalizedCategories);
      const providerResponse = await fetch(providerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "User-Agent": "SipMate-Spots/1.0 (officialsipmate.com)",
        },
        body: new URLSearchParams({ data: query }).toString(),
      });

      if (!providerResponse.ok) {
        console.error("nearby-places provider", providerResponse.status, await providerResponse.text().catch(() => ""));
        return json({ ok: false, error: "provider_unavailable" }, 502);
      }

      const providerData = await providerResponse.json();
      const seen = new Set<string>();
      places = [];

      for (const element of providerData?.elements ?? []) {
        const category = categoryForTags(element.tags);
        if (!category || !normalizedCategories.includes(category)) continue;
        const lat = Number(element.lat ?? element.center?.lat);
        const lon = Number(element.lon ?? element.center?.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
        const name = String(element.tags?.name || "").trim();
        if (!name) continue;
        const id = `${element.type}-${element.id}`;
        if (seen.has(id)) continue;
        seen.add(id);
        places.push({
          id,
          name,
          category,
          latitude: lat,
          longitude: lon,
          address: addressForTags(element.tags),
          openingHours: element.tags?.opening_hours || null,
          website: websiteForTags(element.tags),
          source: "openstreetmap",
        });
      }

      await admin.from("places_cache").upsert({
        cache_key: cacheKey,
        payload: places,
        expires_at: new Date(Date.now() + CACHE_TTL_MS).toISOString(),
      });
    }

    const results = places
      .map((place) => ({
        ...place,
        distanceMeters: distanceMeters(latitude, longitude, place.latitude, place.longitude),
      }))
      .filter((place) => place.distanceMeters <= radiusMeters)
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, MAX_RESULTS);

    return json({
      ok: true,
      places: results,
      radiusMeters,
      fromCache,
      attribution: "© OpenStreetMap contributors",
    });
  } catch (error) {
    console.error("nearby-places", error);
    return json({ ok: false, error: "server_error" }, 500);
  }
});
