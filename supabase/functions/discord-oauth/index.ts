import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DISCORD_CLIENT_ID = Deno.env.get("DISCORD_CLIENT_ID") ?? "";
const DISCORD_CLIENT_SECRET = Deno.env.get("DISCORD_CLIENT_SECRET") ?? "";
const DISCORD_BOT_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN") ?? "";
const DISCORD_GUILD_ID = Deno.env.get("DISCORD_GUILD_ID") ?? "1545876541387440188";
const DISCORD_PREMIUM_ROLE_ID = Deno.env.get("DISCORD_PREMIUM_ROLE_ID") ?? "1546177699662405786";
const CALLBACK_URL = `${SUPABASE_URL}/functions/v1/discord-oauth`;
const APP_RETURN_URL = "sipmate://profile?discord=connected";
const DISCORD_ID_PATTERN = /^\d{17,20}$/;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function redirect(url: string) {
  return new Response(null, {
    status: 302,
    headers: { Location: url, "Cache-Control": "no-store" },
  });
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(digest));
}

function randomState() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

async function getAuthenticatedUser(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

async function updateDiscordRole(discordUserId: string, active: boolean) {
  if (!DISCORD_BOT_TOKEN) return { ok: false, reason: "missing_bot_token" };
  if (!DISCORD_ID_PATTERN.test(discordUserId)) return { ok: false, reason: "invalid_discord_user_id" };

  const response = await fetch(
    `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${discordUserId}/roles/${DISCORD_PREMIUM_ROLE_ID}`,
    {
      method: active ? "PUT" : "DELETE",
      headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
    },
  );

  return { ok: response.status === 204, status: response.status };
}

async function addUserToGuild(discordUserId: string, accessToken: string) {
  if (!DISCORD_BOT_TOKEN || !DISCORD_ID_PATTERN.test(discordUserId) || !accessToken) return;

  const response = await fetch(
    `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${discordUserId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ access_token: accessToken }),
    },
  );

  if (![201, 204].includes(response.status)) {
    console.log("DISCORD GUILD JOIN ERROR:", response.status, await response.text());
  }
}

Deno.serve(async (req) => {
  const url = new URL(req.url);

  if (req.method === "GET") {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const denied = url.searchParams.get("error");

    if (denied) return redirect("sipmate://profile?discord=cancelled");
    if (!code || !state) return redirect("sipmate://profile?discord=error");
    if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
      console.log("DISCORD OAUTH CONFIG MISSING");
      return redirect("sipmate://profile?discord=config");
    }

    const stateHash = await sha256(state);
    const { data: stateRow, error: stateError } = await admin
      .from("discord_oauth_states")
      .select("user_id, expires_at")
      .eq("state_hash", stateHash)
      .maybeSingle();

    await admin.from("discord_oauth_states").delete().eq("state_hash", stateHash);

    if (
      stateError ||
      !stateRow ||
      new Date(stateRow.expires_at).getTime() <= Date.now()
    ) {
      return redirect("sipmate://profile?discord=expired");
    }

    const tokenBody = new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      client_secret: DISCORD_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: CALLBACK_URL,
    });

    const tokenResponse = await fetch("https://discord.com/api/v10/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenBody.toString(),
    });

    if (!tokenResponse.ok) {
      console.log("DISCORD TOKEN ERROR:", tokenResponse.status, await tokenResponse.text());
      return redirect("sipmate://profile?discord=error");
    }

    const tokenData = await tokenResponse.json() as { access_token?: unknown };
    const accessToken = typeof tokenData.access_token === "string" ? tokenData.access_token.trim() : "";
    if (!accessToken || accessToken.length > 4096) {
      console.log("DISCORD TOKEN PAYLOAD INVALID");
      return redirect("sipmate://profile?discord=error");
    }

    const userResponse = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userResponse.ok) {
      console.log("DISCORD USER ERROR:", userResponse.status);
      return redirect("sipmate://profile?discord=error");
    }

    const discordUser = await userResponse.json() as {
      id?: unknown;
      username?: unknown;
      global_name?: unknown;
    };
    const discordUserId = typeof discordUser.id === "string" ? discordUser.id.trim() : "";
    const username = typeof discordUser.username === "string" ? discordUser.username.trim().slice(0, 80) : "";
    const globalName = typeof discordUser.global_name === "string" ? discordUser.global_name.trim().slice(0, 80) : "";
    if (!DISCORD_ID_PATTERN.test(discordUserId) || !username) {
      console.log("DISCORD USER PAYLOAD INVALID");
      return redirect("sipmate://profile?discord=error");
    }

    const { data: existingOwner } = await admin
      .from("profiles")
      .select("id")
      .eq("discord_user_id", discordUserId)
      .neq("id", stateRow.user_id)
      .maybeSingle();

    if (existingOwner) return redirect("sipmate://profile?discord=already-linked");

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .update({
        discord_user_id: discordUserId,
        discord_username: globalName || username,
        discord_connected_at: new Date().toISOString(),
      })
      .eq("id", stateRow.user_id)
      .select("is_premium, premium_until")
      .single();

    if (profileError) {
      console.log("DISCORD PROFILE UPDATE ERROR:", profileError);
      return redirect("sipmate://profile?discord=error");
    }

    await addUserToGuild(discordUserId, accessToken);

    const premiumActive =
      profile.is_premium === true &&
      (!profile.premium_until || new Date(profile.premium_until).getTime() > Date.now());

    if (premiumActive) {
      const roleResult = await updateDiscordRole(discordUserId, true);
      if (!roleResult.ok) console.log("DISCORD PREMIUM ROLE LINK ERROR:", roleResult);
    }

    return redirect(APP_RETURN_URL);
  }

  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const user = await getAuthenticatedUser(req);
  if (!user) return json({ error: "unauthorized" }, 401);

  let body: { action?: string } = {};
  try {
    body = await req.json();
  } catch {
    // Empty body is treated as start.
  }

  if (body.action === "disconnect") {
    const { data: profile, error } = await admin
      .from("profiles")
      .select("discord_user_id")
      .eq("id", user.id)
      .single();

    if (error) return json({ error: "profile_lookup_failed" }, 500);

    if (profile.discord_user_id) {
      const roleResult = await updateDiscordRole(profile.discord_user_id, false);
      if (!roleResult.ok) {
        console.log("DISCORD PREMIUM ROLE UNLINK ERROR:", roleResult);
        return json({ error: "discord_role_revoke_failed" }, 502);
      }
    }

    const { error: clearError } = await admin
      .from("profiles")
      .update({
        discord_user_id: null,
        discord_username: null,
        discord_connected_at: null,
      })
      .eq("id", user.id);

    if (clearError) return json({ error: "disconnect_failed" }, 500);
    return json({ ok: true });
  }

  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
    return json({ error: "discord_oauth_not_configured" }, 503);
  }

  await admin
    .from("discord_oauth_states")
    .delete()
    .lt("expires_at", new Date().toISOString());

  const state = randomState();
  const stateHash = await sha256(state);
  const { error: insertError } = await admin.from("discord_oauth_states").insert({
    state_hash: stateHash,
    user_id: user.id,
  });

  if (insertError) {
    console.log("DISCORD STATE INSERT ERROR:", insertError);
    return json({ error: "state_create_failed" }, 500);
  }

  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    response_type: "code",
    redirect_uri: CALLBACK_URL,
    scope: "identify guilds.join",
    state,
    prompt: "consent",
  });

  return json({
    ok: true,
    url: `https://discord.com/oauth2/authorize?${params.toString()}`,
    callbackUrl: CALLBACK_URL,
  });
});
