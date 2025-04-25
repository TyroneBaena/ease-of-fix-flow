
export interface InviteRequest {
  email: string;
  name: string;
  role: string;
  assignedProperties?: string[];
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
