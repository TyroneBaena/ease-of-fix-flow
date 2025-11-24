import { useState, useEffect } from 'react';

export const useTabRevisit = (thresholdMs: number = 30000) => {
  const [showReloadPrompt, setShowReloadPrompt] = useState(false);
  const [lastVisibleTime, setLastVisibleTime] = useState(Date.now());
  
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User left the tab - record time
        setLastVisibleTime(Date.now());
      } else {
        // User returned - check if we should show reload prompt
        const timeAway = Date.now() - lastVisibleTime;
        if (timeAway > thresholdMs) {
          setShowReloadPrompt(true);
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [lastVisibleTime, thresholdMs]);
  
  return { 
    showReloadPrompt, 
    dismissReloadPrompt: () => setShowReloadPrompt(false) 
  };
};
