/**
 * Tab Visibility Utility
 * Handles tab visibility changes to refresh data when user returns to the tab
 */

export interface VisibilityChangeHandler {
  onVisible: () => void;
  onHidden?: () => void;
}

export const setupVisibilityHandler = (handler: VisibilityChangeHandler) => {
  const handleVisibilityChange = () => {
    if (document.hidden) {
      console.log('👁️ Tab hidden');
      handler.onHidden?.();
    } else {
      console.log('👁️ Tab visible - refreshing data');
      handler.onVisible();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Cleanup function
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
};

/**
 * Debounce function to prevent rapid-fire calls
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};
