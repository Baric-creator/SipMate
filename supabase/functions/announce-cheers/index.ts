import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const DISCORD_CHANNEL_ID = "1546569676346359878";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const discordToken = Deno.env.get("DISCORD_BOT_TOKEN");

  if (!supabaseUrl || !serviceRole || !discordToken) {
    console.error("Missing required environment secrets");
    return json({ error: "Server configuration error" }, 500);
  }

  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const jwt = authHeader.slice("Bearer ".length);
  const { data: userData, error: userError } = await admin.auth.getUser(jwt);
  const caller = userData?.user;

  if (userError || !caller) return json({ error: "Unauthorized" }, 401);

  let body: { other_user_id?: string } = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const otherUserId = body.other_user_id;
  if (!otherUserId || otherUserId === caller.id) {
    return json({ error: "Invalid other_user_id" }, 400);
  }

  const { data: cheersRows, error: cheersError } = await admin
    .from("cheers")
    .select("sender_id, receiver_id")
    .or(
      `and(sender_id.eq.${caller.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${caller.id})`,
    );

  if (cheersError) {
    console.error("CHEERS LOOKUP ERROR", cheersError);
    return json({ error: "Could not verify Cheers" }, 500);
  }

  const hasOutbound = cheersRows?.some(
    (row) => row.sender_id === caller.id && row.receiver_id === otherUserId,
  );
  const hasInbound = cheersRows?.some(
    (row) => row.sender_id === otherUserId && row.receiver_id === caller.id,
  );

  if (!hasOutbound || !hasInbound) {
    return json({ ok: true, announced: false, reason: "not_mutual" });
  }

  const ids = [caller.id, otherUserId].sort();
  const pairKey = `${ids[0]}:${ids[1]}`;

  const { data: profiles, error: profileError } = await admin
    .from("profiles")
    .select("id, avatar_url, city, share_cheers_discord")
    .in("id", ids);

  if (profileError || !profiles || profiles.length !== 2) {
    console.error("PROFILE LOOKUP ERROR", profileError);
    return json({ error: "Could not load profiles" }, 500);
  }

  if (!profiles.every((profile) => profile.share_cheers_discord === true)) {
    return json({ ok: true, announced: false, reason: "consent_required" });
  }

  const { error: reserveError } = await admin
    .from("discord_cheers_announcements")
    .insert({
      pair_key: pairKey,
      user_a: ids[0],
      user_b: ids[1],
    });

  if (reserveError) {
    if (reserveError.code === "23505") {
      return json({ ok: true, announced: false, reason: "already_announced" });
    }
    console.error("ANNOUNCEMENT RESERVE ERROR", reserveError);
    return json({ error: "Could not reserve announcement" }, 500);
  }

  const profileA = profiles.find((p) => p.id === ids[0])!;
  const profileB = profiles.find((p) => p.id === ids[1])!;
  const cities = Array.from(
    new Set(
      [profileA.city, profileB.city]
        .map((city) => city?.trim())
        .filter((city): city is string => Boolean(city)),
    ),
  );
  const cityLabel =
    cities.length === 0 ? "SipMate" : cities.length === 1 ? cities[0] : cities.join(" × ");

  const embeds = profiles
    .filter((profile) => Boolean(profile.avatar_url))
    .map((profile, index) => ({
      title: index === 0 ? "CHEERS! 🍻" : "\u200B",
      description: index === 0 ? cityLabel : "\u200B",
      thumbnail: { url: profile.avatar_url },
      color: 14423100,
    }));

  if (embeds.length === 0) {
    embeds.push({
      title: "CHEERS! 🍻",
      description: cityLabel,
      color: 14423100,
    });
  }

  const discordResponse = await fetch(
    `https://discord.com/api/v10/channels/${DISCORD_CHANNEL_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${discordToken}`,
        "Content-Type": "application/json",
        "User-Agent": "SipMate-Discord-Bot/1.0",
      },
      body: JSON.stringify({
        content: "CHEERS! 🍻",
        embeds,
        allowed_mentions: { parse: [] },
      }),
    },
  );

  if (!discordResponse.ok) {
    const bodyText = await discordResponse.text();
    console.error("DISCORD POST ERROR", discordResponse.status, bodyText);

    await admin
      .from("discord_cheers_announcements")
      .delete()
      .eq("pair_key", pairKey);

    return json({ error: "Discord post failed" }, 502);
  }

  return json({ ok: true, announced: true });
});
