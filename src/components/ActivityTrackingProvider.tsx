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
};

export const ActivityTrackingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { trackPageView } = useActivityTracking();
  const lastPathRef = useRef<string>('');

  useEffect(() => {
    // Only track if path changed
    if (location.pathname !== lastPathRef.current) {
      // Get mapped page name or use the pathname itself
      const pageName = ROUTE_TO_PAGE_NAME[location.pathname] || 
        location.pathname.replace(/^\//, '').replace(/\//g, '_') || 'home';
      
      trackPageView(pageName);
      lastPathRef.current = location.pathname;
    }
  }, [location.pathname, trackPageView]);

  return <>{children}</>;
};
