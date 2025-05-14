
export { userService } from './user';
export type { InviteUserResult } from './user/types';

// Helper function to get the appropriate redirect path based on user role
export const getRedirectPathByRole = (role: string): string => {
  switch (role) {
    case 'contractor':
      return '/contractor-dashboard';
    case 'admin':
    case 'manager':
    default:
      return '/dashboard';
  }
};
