export interface InviteRequest {
  email: string;
  name: string;
  role: string;
  assignedProperties?: string[];
  bypassExistingCheck?: boolean; // Add this property
}

export interface EmailData {
  to: string;
  name: string;
  role: string;
  temporaryPassword?: string;
  loginUrl: string;
  isNewUser: boolean;
}

export interface Environment {
  resendApiKey: string;
  applicationUrl: string;
  ownerEmail: string;
}

export interface RespondResponseData {
  id?: string;
  [key: string]: any;
}

export interface UserCheckResult {
  exists: boolean;
  user?: any;
  hasProfile?: boolean;
  isPlaceholder?: boolean;
  email?: string;
  profile?: any;
}

export interface InviteResponse {
  success: boolean;
  message: string;
  userId?: string;
  emailSent?: boolean;
  emailError?: string;
  testMode?: boolean;
  testModeInfo?: string;
  isNewUser?: boolean;
  email?: string;
}
