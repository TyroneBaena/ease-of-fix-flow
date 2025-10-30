
import { InviteRequest, Environment } from "./types.ts";
import { corsHeaders } from "./cors.ts";

export function validateRequest(body: InviteRequest) {
  // Check for required fields
  if (!body) {
    throw new Error("Request body is empty");
  }

  const { email, name, role } = body;
  
  if (!email) {
    throw new Error("Email is required");
  }
  
  if (!name) {
    throw new Error("Name is required");
  }
  
  if (!role) {
    throw new Error("Role is required");
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error("Invalid email format");
  }
  
  // Validate role values
  if (role !== 'admin' && role !== 'manager') {
    throw new Error("Role must be either 'admin' or 'manager'");
  }
  
  // For managers, validate assigned properties if provided
  if (role === 'manager' && body.assignedProperties) {
    if (!Array.isArray(body.assignedProperties)) {
      throw new Error("Assigned properties must be an array");
    }
  }
}

export function validateEnvironment(): Environment {
  const resendApiKey = Deno.env.get('NEW_RESEND_API_KEY');
  const applicationUrl = Deno.env.get('APPLICATION_URL') || 'https://housinghub.app';
  const ownerEmail = Deno.env.get('RESEND_OWNER_EMAIL') || 'tyronebaena@gmail.com';

  console.log('Environment Checks:', {
    NEW_RESEND_API_KEY: resendApiKey ? 'Present' : 'Missing',
    APPLICATION_URL: applicationUrl ? 'Present' : 'Missing',
    APPLICATION_URL_VALUE: applicationUrl,
    RESEND_OWNER_EMAIL: ownerEmail
  });

  if (!resendApiKey) {
    throw new Error("NEW_RESEND_API_KEY is not set in the environment variables");
  }

  return { resendApiKey, applicationUrl, ownerEmail };
}

export function cleanApplicationUrl(url: string): string {
  if (!url) {
    return '';
  }
  
  let cleanUrl = url;
  if (cleanUrl.endsWith('/')) {
    cleanUrl = cleanUrl.slice(0, -1);
  }
  if (cleanUrl.endsWith('/login')) {
    cleanUrl = cleanUrl.slice(0, -6);
  }
  return cleanUrl;
}
