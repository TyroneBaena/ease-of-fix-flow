
export interface InviteRequest {
  email: string;
  name: string;
  role: 'admin' | 'manager';
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
