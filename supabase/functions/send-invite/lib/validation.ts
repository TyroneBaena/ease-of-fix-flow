
import { InviteRequest } from "./types.ts";
import { corsHeaders } from "./cors.ts";

export function validateRequest(body: InviteRequest) {
  const { email, name, role } = body;
  
  if (!email || !name || !role) {
    console.error("Missing required fields:", { email, name, role });
    throw new Error("Email, name, and role are required");
  }
}

export function validateEnvironment() {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const applicationUrl = Deno.env.get('APPLICATION_URL');
  const ownerEmail = Deno.env.get('RESEND_OWNER_EMAIL') || 'tyronebaena@gmail.com';

  console.log('Environment Checks:', {
    RESEND_API_KEY: resendApiKey ? 'Present' : 'Missing',
    APPLICATION_URL: applicationUrl ? 'Present' : 'Missing',
    APPLICATION_URL_VALUE: applicationUrl,
    RESEND_OWNER_EMAIL: ownerEmail
  });

  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY is not set in the environment variables");
  }

  if (!applicationUrl) {
    throw new Error("APPLICATION_URL is not set in the environment variables");
  }

  return { resendApiKey, applicationUrl, ownerEmail };
}

export function cleanApplicationUrl(url: string): string {
  let cleanUrl = url;
  if (cleanUrl.endsWith('/')) {
    cleanUrl = cleanUrl.slice(0, -1);
  }
  if (cleanUrl.endsWith('/login')) {
    cleanUrl = cleanUrl.slice(0, -6);
  }
  return cleanUrl;
}
