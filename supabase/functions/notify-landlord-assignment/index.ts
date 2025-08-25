
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type NotifyPayload = {
  request_id: string;
  landlord_email: string;
  landlord_name?: string;
};

const log = (step: string, details?: unknown) => {
  console.log(`[NOTIFY-LANDLORD] ${step}${details ? " - " + JSON.stringify(details) : ""}`);
};

serve(async (req) => {
  log("Function called", { method: req.method, url: req.url });
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const resendApiKey = Deno.env.get("NEW_RESEND_API_KEY") ?? "";
  const inboundReplyBase = Deno.env.get("INBOUND_REPLY_ADDRESS") ?? "";

  log("Environment check", { 
    hasResendKey: !!resendApiKey, 
    hasInboundReply: !!inboundReplyBase,
    resendKeyLength: resendApiKey.length,
    inboundReplyAddress: inboundReplyBase,
    allEnvKeys: Object.keys(Deno.env.toObject()).filter(key => 
      key.includes('RESEND') || key.includes('INBOUND')
    )
  });

  // More robust validation - check for actual content, not just existence
  if (!resendApiKey || resendApiKey.trim() === "" || resendApiKey.length < 10) {
    log("ERROR", { message: "NEW_RESEND_API_KEY is missing or invalid", keyLength: resendApiKey.length });
    return new Response(JSON.stringify({ error: "NEW_RESEND_API_KEY is missing or invalid" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }

  if (!inboundReplyBase || inboundReplyBase.trim() === "" || !inboundReplyBase.includes("@")) {
    log("ERROR", { message: "INBOUND_REPLY_ADDRESS must be a valid email address", address: inboundReplyBase });
    return new Response(JSON.stringify({ error: "INBOUND_REPLY_ADDRESS must be a valid email address" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw new Error(userError.message);
    const user = userData.user;
    log("Authenticated", { userId: user?.id, email: user?.email });

    const { request_id, landlord_email, landlord_name }: NotifyPayload = await req.json();
    if (!request_id || !landlord_email) throw new Error("request_id and landlord_email are required");

    // Fetch request + property metadata for a nicer email
    const { data: request, error: reqErr } = await supabase
      .from("maintenance_requests")
      .select("id, title, description, location, site, property_id, created_at")
      .eq("id", request_id)
      .single();
    if (reqErr || !request) throw new Error(`Request not found: ${reqErr?.message || "unknown"}`);

    let property: any = null;
    if (request.property_id) {
      const { data: prop, error: propErr } = await supabase
        .from("properties")
        .select("name, address, practice_leader, practice_leader_email, practice_leader_phone, contact_number")
        .eq("id", request.property_id)
        .single();
      if (!propErr) property = prop;
    }

    // Create a unique token and store in email_relay_keys
    const tokenValue = crypto.randomUUID();
    const { error: relayErr } = await supabase.from("email_relay_keys").insert({
      token: tokenValue,
      request_id,
      recipient_email: landlord_email,
      actor_type: "landlord",
      is_active: true,
    });
    if (relayErr) throw new Error(`Failed to create relay token: ${relayErr.message}`);

    // Build Reply-To using plus addressing
    const [local, domain] = inboundReplyBase.split("@");
    if (!local || !domain) throw new Error("INBOUND_REPLY_ADDRESS must be a valid email address");
    const replyTo = `${local}+${tokenValue}@${domain}`;

    // Compose email
    const title = request.title || "Maintenance Request";
    const preview = (request.description || "").slice(0, 160);
    const propertyBlock = property
      ? `
        <p><strong>Property:</strong> ${property.name || ""}</p>
        <p><strong>Address:</strong> ${property.address || ""}</p>
        ${property.practice_leader ? `<p><strong>Practice Leader:</strong> ${property.practice_leader}</p>` : ""}
        ${property.practice_leader_phone ? `<p><strong>Practice Leader Phone:</strong> ${property.practice_leader_phone}</p>` : ""}
        ${property.practice_leader_email ? `<p><strong>Practice Leader Email:</strong> ${property.practice_leader_email}</p>` : ""}
        ${property.contact_number ? `<p><strong>Site Contact:</strong> ${property.contact_number}</p>` : ""}
      `
      : "";

    const html = `
      <div style="font-family: Inter, Arial, sans-serif; line-height: 1.6;">
        <h2>New Maintenance Request Assigned</h2>
        <p>Hi ${landlord_name || "there"},</p>
        <p>You have been assigned the following maintenance request:</p>
        <p><strong>${title}</strong></p>
        <p>${preview}</p>
        <p><strong>Location:</strong> ${request.location || "N/A"}</p>
        <p><strong>Site:</strong> ${request.site || "N/A"}</p>
        ${propertyBlock}
        <hr />
        <p><strong>Reply to this email</strong> to leave a note that will be added to the request's activity.</p>
        <p>Request ID: ${request_id}</p>
      </div>
    `;

    const resend = new Resend(resendApiKey);
    const from = "Property Manager <noreply@housinghub.app>";
    const subject = `Assigned: ${title}`;

    const sendResult = await resend.emails.send({
      from,
      to: [landlord_email],
      subject,
      html,
      reply_to: replyTo,
    });
    log("Email sent", { id: sendResult?.data?.id });

    // Mark the request as assigned to landlord and log activity
    const nowIso = new Date().toISOString();
    await supabase
      .from("maintenance_requests")
      .update({
        assigned_to_landlord: true,
        landlord_assigned_by: user?.id ?? null,
        landlord_assigned_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", request_id);

    await supabase.from("activity_logs").insert({
      request_id,
      action_type: "landlord_assigned",
      description: `Assigned to landlord ${landlord_email}; email sent.`,
      actor_name: user?.email ?? "System",
      actor_role: "manager",
      metadata: { landlord_email, reply_to: replyTo, email_id: sendResult?.data?.id ?? null },
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    log("ERROR", { message });
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
