import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useActivityTracking } from '@/hooks/useActivityTracking';

const ROUTE_TO_PAGE_NAME: Record<string, string> = {
  '/': 'dashboard',
  '/properties': 'properties',
  '/requests': 'requests',
  '/reports': 'reports',
  '/settings': 'settings',
  '/calendar': 'calendar',
  '/new-request': 'new_request',
  '/admin/users': 'admin_users',
  '/admin/contractors': 'admin_contractors',
  '/admin/timeline': 'scheduled_timeline',
  // Contractor portal routes
  '/contractor': 'contractor_dashboard',
  '/contractor/jobs': 'contractor_jobs',
  '/contractor/profile': 'contractor_profile',
  '/contractor/schedule': 'contractor_schedule',
  '/contractor/settings': 'contractor_settings',
};

const getPageName = (pathname: string): string => {
  // Check static mapping first
  if (ROUTE_TO_PAGE_NAME[pathname]) {
    return ROUTE_TO_PAGE_NAME[pathname];
  }
  
  // Handle dynamic contractor routes
  if (pathname.startsWith('/contractor/job/')) {
    return 'contractor_job_detail';
  }
  if (pathname.startsWith('/contractor/quote-submission/')) {
    return 'contractor_quote_submission';
  }
  
  // Fallback: convert path to snake_case
  return pathname.replace(/^\//, '').replace(/\//g, '_') || 'home';
};

export const ActivityTrackingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { trackPageView } = useActivityTracking();
  const lastPathRef = useRef<string>('');

  useEffect(() => {
    // Only track if path changed
    if (location.pathname !== lastPathRef.current) {
      const pageName = getPageName(location.pathname);
      trackPageView(pageName);
      lastPathRef.current = location.pathname;
    }
  }, [location.pathname, trackPageView]);

  return <>{children}</>;
};
