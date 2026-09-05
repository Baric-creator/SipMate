import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://officialsipmate.com",
  "https://www.officialsipmate.com",
]);

function cors(origin: string | null) {
  const allow = origin && allowedOrigins.has(origin) ? origin : "https://officialsipmate.com";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const headers = { ...cors(origin), "Content-Type": "application/json" };

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers });
  if (origin && !allowedOrigins.has(origin)) return new Response(JSON.stringify({ error: "origin_not_allowed" }), { status: 403, headers });

  try {
    const body = await req.json();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const name = String(body?.name ?? "").trim().slice(0, 80) || null;
    const city = String(body?.city ?? "").trim().slice(0, 120) || null;
    const locale = ["en", "de", "hr"].includes(body?.locale) ? body.locale : "en";

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return new Response(JSON.stringify({ error: "invalid_email" }), { status: 400, headers });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );

    const { error } = await supabase
      .from("waitlist")
      .insert({ email, name, city, locale, source: "officialsipmate.com" });

    if (error?.code === "23505") {
      return new Response(JSON.stringify({ ok: true, already: true }), { status: 200, headers });
    }
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true }), { status: 201, headers });
  } catch {
    return new Response(JSON.stringify({ error: "server_error" }), { status: 500, headers });
  }
});