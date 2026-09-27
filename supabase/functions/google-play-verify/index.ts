import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PACKAGE_NAME = "com.bariccreator.sipmate";
const PRODUCT_ID = "sipmate_premium";
const BASE_PLAN_ID = "monthly";

const ALLOWED_ORIGINS = new Set([
  "https://officialsipmate.com",
  "https://www.officialsipmate.com",
]);

const MAX_BODY_BYTES = 16_384;
const TOKEN_PATTERN = /^[A-Za-z0-9._~+/=-]{10,4096}$/;

function cors(origin: string | null) {
  const allow =
    origin && ALLOWED_ORIGINS.has(origin)
      ? origin
      : "https://officialsipmate.com";

  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  };
}

function json(
  headers: Record<string, string>,
  status: number,
  body: Record<string, unknown>,
) {
  return new Response(JSON.stringify(body), { status, headers });
}

function base64UrlEncode(input: Uint8Array | string): string {
  const bytes =
    typeof input === "string" ? new TextEncoder().encode(input) : input;

  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const clean = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");

  const binary = atob(clean);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));

  return await crypto.subtle.importKey(
    "pkcs8",
    bytes.buffer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );
}

async function getGoogleAccessToken(credentials: {
  client_email: string;
  private_key: string;
  token_uri?: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const payload = {
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: credentials.token_uri || "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const unsigned =
    `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}`;

  const key = await importPrivateKey(credentials.private_key);

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );

  const assertion =
    `${unsigned}.${base64UrlEncode(new Uint8Array(signature))}`;

  const tokenResponse = await fetch(
    credentials.token_uri || "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    },
  );

  if (!tokenResponse.ok) {
    const text = await tokenResponse.text();
    console.error(
      "GOOGLE OAUTH ERROR",
      tokenResponse.status,
      text.slice(0, 500),
    );
    throw new Error("google_auth_failed");
  }

  const data = await tokenResponse.json();

  if (!data?.access_token) {
    throw new Error("google_auth_failed");
  }

  return String(data.access_token);
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const headers = cors(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return json(headers, 403, {
      ok: false,
      error: "origin_not_allowed",
    });
  }

  if (req.method !== "POST") {
    return json(headers, 405, {
      ok: false,
      error: "method_not_allowed",
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const credentialsRaw = Deno.env.get(
      "GOOGLE_PLAY_SERVICE_ACCOUNT_JSON",
    );

    if (
      !supabaseUrl ||
      !anonKey ||
      !serviceKey ||
      !credentialsRaw
    ) {
      return json(headers, 503, {
        ok: false,
        error: "temporarily_unavailable",
      });
    }

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");

    if (!token) {
      return json(headers, 401, {
        ok: false,
        error: "unauthorized",
      });
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
    });

    const { data: userData, error: userError } =
      await authClient.auth.getUser(token);

    const user = userData?.user;

    if (userError || !user) {
      return json(headers, 401, {
        ok: false,
        error: "unauthorized",
      });
    }

    const rawBody = await req.text();

    if (
      new TextEncoder().encode(rawBody).byteLength >
        MAX_BODY_BYTES
    ) {
      return json(headers, 413, {
        ok: false,
        error: "request_too_large",
      });
    }

    let body: Record<string, unknown>;

    try {
      body = JSON.parse(rawBody || "{}");
    } catch {
      return json(headers, 400, {
        ok: false,
        error: "invalid_json",
      });
    }

    const purchaseToken =
      String(body.purchase_token ?? body.purchaseToken ?? "").trim();

    if (
      !purchaseToken ||
      !TOKEN_PATTERN.test(purchaseToken)
    ) {
      return json(headers, 400, {
        ok: false,
        error: "invalid_purchase_token",
      });
    }

    let credentials: {
      client_email?: string;
      private_key?: string;
      token_uri?: string;
    };

    try {
      credentials = JSON.parse(credentialsRaw);
    } catch {
      console.error("GOOGLE PLAY CREDENTIAL JSON INVALID");
      return json(headers, 503, {
        ok: false,
        error: "billing_configuration_error",
      });
    }

    if (
      !credentials.client_email ||
      !credentials.private_key
    ) {
      return json(headers, 503, {
        ok: false,
        error: "billing_configuration_error",
      });
    }

    const googleAccessToken = await getGoogleAccessToken({
      client_email: credentials.client_email,
      private_key: credentials.private_key,
      token_uri: credentials.token_uri,
    });

    const verifyUrl =
      `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(PACKAGE_NAME)}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;

    const googleResponse = await fetch(verifyUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${googleAccessToken}`,
        Accept: "application/json",
      },
    });

    if (!googleResponse.ok) {
      const errorText = await googleResponse.text();

      console.error(
        "GOOGLE PLAY VERIFY ERROR",
        googleResponse.status,
        errorText.slice(0, 800),
      );

      if (googleResponse.status === 404) {
        return json(headers, 400, {
          ok: false,
          error: "purchase_not_found",
        });
      }

      if (
        googleResponse.status === 401 ||
        googleResponse.status === 403
      ) {
        return json(headers, 503, {
          ok: false,
          error: "billing_verification_unavailable",
        });
      }

      return json(headers, 502, {
        ok: false,
        error: "google_play_error",
      });
    }

    const purchase = await googleResponse.json();

    const subscriptionState =
      String(purchase?.subscriptionState ?? "");

    const acknowledgementState =
      String(purchase?.acknowledgementState ?? "");

    const lineItems = Array.isArray(purchase?.lineItems)
      ? purchase.lineItems
      : [];

    const matchingItems = lineItems.filter(
      (item: Record<string, unknown>) =>
        String(item?.productId ?? "") === PRODUCT_ID,
    );

    if (matchingItems.length === 0) {
      return json(headers, 400, {
        ok: false,
        error: "wrong_product",
      });
    }

    const matchingItem = matchingItems
      .filter((item: any) => {
        const basePlan =
          String(item?.offerDetails?.basePlanId ?? "");

        return !basePlan || basePlan === BASE_PLAN_ID;
      })
      .sort((a: any, b: any) => {
        const aTime = Date.parse(String(a?.expiryTime ?? ""));
        const bTime = Date.parse(String(b?.expiryTime ?? ""));

        return (Number.isFinite(bTime) ? bTime : 0) -
          (Number.isFinite(aTime) ? aTime : 0);
      })[0];

    if (!matchingItem) {
      return json(headers, 400, {
        ok: false,
        error: "wrong_base_plan",
      });
    }

    const basePlanId =
      String(matchingItem?.offerDetails?.basePlanId ?? "");

    if (basePlanId && basePlanId !== BASE_PLAN_ID) {
      return json(headers, 400, {
        ok: false,
        error: "wrong_base_plan",
      });
    }

    const expiryTime =
      String(matchingItem?.expiryTime ?? "");

    const expiryMs = Date.parse(expiryTime);

    if (!expiryTime || !Number.isFinite(expiryMs)) {
      return json(headers, 400, {
        ok: false,
        error: "invalid_expiry",
      });
    }

    const allowedStates = new Set([
      "SUBSCRIPTION_STATE_ACTIVE",
      "SUBSCRIPTION_STATE_IN_GRACE_PERIOD",
    ]);

    if (
      !allowedStates.has(subscriptionState) ||
      expiryMs <= Date.now()
    ) {
      return json(headers, 409, {
        ok: false,
        error: "subscription_not_active",
        subscription_state: subscriptionState,
      });
    }

    const autoRenewEnabled =
      matchingItem?.autoRenewingPlan?.autoRenewEnabled === true;

    const latestOrderId =
      String(
        matchingItem?.latestSuccessfulOrderId ??
          purchase?.latestOrderId ??
          "",
      ) || null;

    const sb = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // A purchase token may only belong to one SipMate account.
    const { data: existingToken, error: existingError } =
      await sb
        .from("google_play_subscriptions")
        .select("user_id")
        .eq("purchase_token", purchaseToken)
        .maybeSingle();

    if (existingError) {
      console.error(
        "GOOGLE PLAY TOKEN LOOKUP ERROR",
        existingError,
      );

      return json(headers, 500, {
        ok: false,
        error: "verification_storage_failed",
      });
    }

    if (
      existingToken &&
      existingToken.user_id !== user.id
    ) {
      console.error(
        "GOOGLE PLAY TOKEN OWNERSHIP CONFLICT",
        purchaseToken.slice(0, 12),
      );

      return json(headers, 409, {
        ok: false,
        error: "purchase_already_claimed",
      });
    }

    const { error: applyError } = await sb.rpc(
      "apply_google_play_premium",
      {
        p_user_id: user.id,
        p_purchase_token: purchaseToken,
        p_product_id: PRODUCT_ID,
        p_base_plan_id: basePlanId || BASE_PLAN_ID,
        p_subscription_state: subscriptionState,
        p_expiry_time: expiryTime,
        p_acknowledgement_state: acknowledgementState,
        p_latest_order_id: latestOrderId,
        p_auto_renew_enabled: autoRenewEnabled,
        p_raw_response: purchase,
      },
    );

    if (applyError) {
      console.error(
        "GOOGLE PLAY APPLY PREMIUM ERROR",
        applyError,
      );

      return json(headers, 500, {
        ok: false,
        error: "entitlement_update_failed",
      });
    }

    let acknowledged =
      acknowledgementState ===
        "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED";

    if (!acknowledged) {
      const acknowledgeUrl =
        `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(PACKAGE_NAME)}/purchases/subscriptions/${encodeURIComponent(PRODUCT_ID)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`;

      const acknowledgeResponse = await fetch(
        acknowledgeUrl,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${googleAccessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        },
      );

      if (acknowledgeResponse.ok) {
        acknowledged = true;
      } else {
        const ackText =
          await acknowledgeResponse.text();

        console.error(
          "GOOGLE PLAY ACKNOWLEDGE ERROR",
          acknowledgeResponse.status,
          ackText.slice(0, 500),
        );
      }
    }

    return json(headers, 200, {
      ok: true,
      premium: true,
      product_id: PRODUCT_ID,
      base_plan_id: basePlanId || BASE_PLAN_ID,
      subscription_state: subscriptionState,
      premium_until: expiryTime,
      auto_renew: autoRenewEnabled,
      acknowledged,
    });
  } catch (error) {
    console.error("GOOGLE PLAY VERIFY ERROR", error);

    return json(headers, 500, {
      ok: false,
      error: "server_error",
    });
  }
});
