
import { InviteRequest, Environment } from "./types.ts";

export function validateRequest(body: InviteRequest) {
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
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error("Invalid email format");
  }
  
  if (role !== 'admin' && role !== 'manager') {
    throw new Error("Role must be either 'admin' or 'manager'");
  }
  
  if (role === 'manager' && body.assignedProperties) {
    if (!Array.isArray(body.assignedProperties)) {
      throw new Error("Assigned properties must be an array");
    }
  }
}

export function validateEnvironment(): Environment {
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
