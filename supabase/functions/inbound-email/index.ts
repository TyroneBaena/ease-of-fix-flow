import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-resend-secret",
};

type InboundRecipient = string | { address?: string; name?: string };
type InboundBody = {
  to?: InboundRecipient[] | InboundRecipient;
  from?: InboundRecipient | { address?: string; name?: string } | string;
  subject?: string;
  text?: string;
  html?: string;
  headers?: Record<string, string>;
};

const log = (step: string, details?: unknown) => {
  console.log(`[INBOUND-EMAIL] ${step}${details ? " - " + JSON.stringify(details) : ""}`);
};

function normalizeAddress(rec: InboundRecipient | undefined): string | null {
  if (!rec) return null;
  if (typeof rec === "string") return rec.toLowerCase();
  const addr = (rec as any).address ?? (rec as any).to ?? null;
  return addr ? String(addr).toLowerCase() : null;
}

function extractTokenFromEmail(addr: string): string | null {
  // Matches plus addressing: local+token@domain
  const [localPart, domain] = addr.split("@");
  if (!localPart || !domain) return null;
  const plusIdx = localPart.indexOf("+");
  if (plusIdx === -1) return null;
  const token = localPart.substring(plusIdx + 1);
  return token || null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const inboundSecret = Deno.env.get("RESEND_INBOUND_SECRET") ?? "";

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  try {
    // Verify inbound secret from Resend route (configure this header in Resend)
    const provided = req.headers.get("x-resend-secret");
    if (!inboundSecret || provided !== inboundSecret) {
      log("Invalid inbound secret");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const body: InboundBody = await req.json();
    log("Inbound body received", { subject: body.subject });

    // Normalize recipients from body.to (can be a string, object, or array)
    const recipientsArr = Array.isArray(body.to) ? body.to : body.to ? [body.to] : [];
    const recipientEmails = recipientsArr
      .map((r) => normalizeAddress(r))
      .filter((x): x is string => !!x);

    // Extract the first token we can find
    let token: string | null = null;
    for (const addr of recipientEmails) {
      token = extractTokenFromEmail(addr);
      if (token) break;
    }
    if (!token) {
      log("No token in recipients", { recipients: recipientEmails });
      // No token – nothing to do, but we ACK with 200 to avoid retries
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Resolve token -> request
    const { data: relay, error: relayErr } = await supabase
      .from("email_relay_keys")
      .select("id, request_id, recipient_email, actor_type, is_active, expires_at")
      .eq("token", token)
      .maybeSingle();

    if (relayErr || !relay) {
      log("Relay token not found", { token, err: relayErr?.message });
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const now = new Date();
    if (!relay.is_active || (relay.expires_at && new Date(relay.expires_at) < now)) {
      log("Relay token inactive/expired", { token });
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const fromAddr = normalizeAddress(body.from as any) ?? "unknown@unknown";
    const fromName =
      typeof body.from === "string"
        ? body.from
        : (body.from as any)?.name || fromAddr;

    const text = (body.text && body.text.trim()) || "";
    const snippet = text.length > 500 ? text.slice(0, 500) + "…" : text;

    // Insert into activity_logs (safe – no user_id required)
    const { error: logErr } = await supabase.from("activity_logs").insert({
      request_id: relay.request_id,
      action_type: "email_reply_received",
      description: snippet || "(No text content)",
      actor_name: fromName,
      actor_role: relay.actor_type || "external",
      metadata: {
        from: fromAddr,
        subject: body.subject || "",
        length: text.length,
      },
    });
    if (logErr) throw new Error(`Failed to log activity: ${logErr.message}`);

    // Update relay key last used timestamp (keep active for threading)
    await supabase
      .from("email_relay_keys")
      .update({ used_at: now.toISOString() })
      .eq("id", relay.id);

    log("Reply processed", { request_id: relay.request_id, from: fromAddr });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    log("ERROR", { message });
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
