
import { Resend } from "https://esm.sh/resend@2.0.0";
import { corsHeaders } from "./cors.ts";
import { EmailData, RespondResponseData } from "./types.ts";

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
    
    const { data, error } = await resend.emails.send({
      from: 'Property Manager <onboarding@resend.dev>',
      to: [emailRecipient],
      subject: `${isTestMode ? '[TEST] ' : ''}Welcome to Property Manager`,
      html: isTestMode 
        ? `<p><strong>TEST MODE:</strong> This email would normally be sent to ${email}</p>${emailHtml}` 
        : emailHtml,
    });

    if (error) {
      console.error("Error sending email via Resend:", error);
      throw error;
    }
    
    console.log(`Email sent successfully to ${emailRecipient}, EmailID: ${data?.id}`);
    return data;
  } catch (error) {
    console.error("Failed to send email:", error);
    throw new Error(`Email sending failed: ${error.message || 'Unknown error'}`);
  }
}
