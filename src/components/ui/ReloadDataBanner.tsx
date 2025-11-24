import { Button } from '@/components/ui/button';
import { RefreshCw, X } from 'lucide-react';

interface ReloadDataBannerProps {
  show: boolean;
  onReload: () => void;
  onDismiss: () => void;
  loading?: boolean;
}

export const ReloadDataBanner = ({ show, onReload, onDismiss, loading = false }: ReloadDataBannerProps) => {
  if (!show) return null;
  
  return (
    <div className="fixed top-0 left-0 right-0 z-50 animate-in slide-in-from-top duration-300">
      <div className="bg-blue-50 dark:bg-blue-950/50 border-b border-blue-200 dark:border-blue-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <RefreshCw className={`h-5 w-5 text-blue-600 dark:text-blue-400 ${loading ? 'animate-spin' : ''}`} />
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  You've been away for a while
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Settings data may be outdated. Click to refresh.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={onReload} 
                size="sm" 
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white"
              >
                {loading ? 'Reloading...' : 'Reload Data'}
              </Button>
              <Button 
                onClick={onDismiss} 
                variant="ghost" 
                size="sm"
                disabled={loading}
                className="text-blue-900 dark:text-blue-100"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
