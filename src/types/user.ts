
export type UserRole = 'admin' | 'manager';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  assignedProperties?: string[]; // Array of property IDs for managers
  createdAt: string;
}
