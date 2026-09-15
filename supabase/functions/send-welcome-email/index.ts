import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const PROD_ORIGIN = "https://officialsipmate.com";
const ALLOWED_ORIGINS = new Set([
  PROD_ORIGIN,
  "https://www.officialsipmate.com",
  "http://localhost:8081",
  "http://localhost:8082",
  "http://localhost:19006",
]);
const EMAIL_PROVIDER_TIMEOUT_MS = 8_000;

function headersFor(req: Request) {
  const origin = req.headers.get("origin");
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.has(origin) ? origin : PROD_ORIGIN,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: headersFor(req) });
}

const copy = {
  en: {
    subject: "Welcome to SipMate 🍻",
    heading: "Welcome to SipMate!",
    body: "Your SipMate account is ready. Find people nearby who are up for a drink, send a Cheers, and when it is mutual — CHEERS!",
  },
  de: {
    subject: "Willkommen bei SipMate 🍻",
    heading: "Willkommen bei SipMate!",
    body: "Dein SipMate-Konto ist bereit. Finde Leute in deiner Nähe, sende ein Cheers und wenn es gegenseitig ist — CHEERS!",
  },
  hr: {
    subject: "Dobrodošao/la na SipMate 🍻",
    heading: "Dobrodošao/la na SipMate!",
    body: "Tvoj SipMate račun je spreman. Pronađi ljude u blizini koji su za piće, pošalji Cheers i kada je obostrano — CHEERS!",
  },
} as const;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: headersFor(req) });
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json(req, { error: "origin_not_allowed" }, 403);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json(req, { error: "unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL");
    if (!supabaseUrl || !anonKey || !serviceRole || !resendApiKey || !fromEmail) {
      console.error("WELCOME EMAIL CONFIGURATION ERROR");
      return json(req, { error: "temporarily_unavailable" }, 503);
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const token = authHeader.slice("Bearer ".length);
    const { data: userData, error: userError } = await callerClient.auth.getUser(token);
    const user = userData?.user;
    if (userError || !user?.email) return json(req, { error: "unauthorized" }, 401);

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      return json(req, { error: "invalid_json" }, 400);
    }

    const language = ["en", "de", "hr"].includes(String(body.language ?? ""))
      ? String(body.language) as keyof typeof copy
      : "en";

    const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
    const { data: profile } = await admin
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .maybeSingle();

    const rawName = typeof profile?.name === "string" ? profile.name.trim().slice(0, 50) : "";
    const greetingName = rawName ? ` ${escapeHtml(rawName)}` : "";
    const text = copy[language];
    const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#0b0b0e;color:#f4f4f5;padding:28px"><div style="max-width:560px;margin:auto;background:#151518;border-radius:18px;padding:28px"><h1 style="margin-top:0">${escapeHtml(text.heading)}${greetingName}</h1><p style="line-height:1.6">${escapeHtml(text.body)}</p><p style="color:#a1a1aa">SipMate 🍻</p></div></body></html>`;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [user.email],
        subject: text.subject,
        html,
      }),
      signal: AbortSignal.timeout(EMAIL_PROVIDER_TIMEOUT_MS),
    });

    const providerResult = await resendResponse.json().catch(() => ({}));
    if (!resendResponse.ok) {
      console.error("WELCOME EMAIL PROVIDER ERROR", resendResponse.status, providerResult);
      return json(req, { error: "email_failed" }, 502);
    }

    return json(req, { ok: true });
  } catch (error) {
    console.error("WELCOME EMAIL ERROR", error);
    return json(req, { error: "server_error" }, 500);
  }
});
