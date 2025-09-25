import { Resend } from "https://esm.sh/resend@2.0.0";
import { corsHeaders } from "./cors.ts";

export async function sendInvitationEmail(
  resendApiKey: string,
  emailRecipient: string,
  email: string,
  emailHtml: string,
  isTestMode: boolean
) {
  if (!resendApiKey) {
    console.error("Missing Resend API key");
    throw new Error("Email service configuration is missing");
  }
  
  if (!emailRecipient) {
    console.error("Missing email recipient");
    throw new Error("Email recipient is required");
  }
  
  if (!emailHtml) {
    console.error("Missing email HTML content");
    throw new Error("Email content is required");
  }
  
  try {
    const resend = new Resend(resendApiKey);
    console.log("Attempting to send email...");
    console.log(`Email will be sent to ${emailRecipient} (${isTestMode ? 'TEST MODE - redirected' : 'direct send'})`);
    console.log("API Key length:", resendApiKey.length);
    console.log("API Key prefix:", resendApiKey.substring(0, 10) + "...");
    console.log("Target email:", email);
    console.log("Recipient email:", emailRecipient);
    console.log("Is test mode:", isTestMode);
    
    const { data, error } = await resend.emails.send({
      from: 'Property Manager <noreply@housinghub.app>',
      to: [emailRecipient],
      subject: `${isTestMode ? '[TEST] ' : ''}Welcome to Property Manager`,
      html: isTestMode 
        ? `<p><strong>TEST MODE:</strong> This email would normally be sent to ${email}</p>${emailHtml}` 
        : emailHtml,
    });

    if (error) {
      console.error("Error sending email via Resend:", error);
      console.error("Error type:", typeof error);
      console.error("Error string:", JSON.stringify(error));
      
      // Handle specific Resend test mode error
      if ((error as any).error && (error as any).error.includes("verify a domain")) {
        throw new Error(`Resend Domain Verification Required: ${error.error}. Please verify your domain at https://resend.com/domains or upgrade your Resend plan.`);
      }
      
      throw new Error(`Resend API Error: ${(error as any).error || (error as any).message || JSON.stringify(error)}`);
    }
    
    console.log(`Email sent successfully to ${emailRecipient}, EmailID: ${data?.id}`);
    return data;
  } catch (error) {
    console.error("Failed to send email:", error);
    console.error("Error type:", typeof error);
    console.error("Error message:", error?.message);
    console.error("Error name:", error?.name);
    console.error("Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    throw new Error(`Email sending failed: ${error?.message || error?.toString() || 'Unknown error'}`);
  }
}
