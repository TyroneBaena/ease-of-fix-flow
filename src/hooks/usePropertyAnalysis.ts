import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AnalysisProgress {
  total: number;
  completed: number;
  current?: string;
}

export const usePropertyAnalysis = () => {
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);

  const analyzeProperty = useCallback(async (propertyId: string, propertyName?: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to analyze properties');
        return null;
      }

      const { data, error } = await supabase.functions.invoke('analyze-property-hotspot', {
        body: { propertyId },
      });

      if (error) throw error;

      toast.success(`Analysis complete for ${propertyName || 'property'}`);
      return data;
    } catch (error) {
      console.error('Error analyzing property:', error);
      toast.error(`Failed to analyze ${propertyName || 'property'}`);
      return null;
    }
  }, []);

  const analyzeAllProperties = useCallback(async (properties: Array<{ id: string; name: string }>) => {
    if (properties.length === 0) {
      toast.info('No properties to analyze');
      return;
    }

    setAnalyzing(true);
    setProgress({ total: properties.length, completed: 0 });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < properties.length; i++) {
      const property = properties[i];
      setProgress({ 
        total: properties.length, 
        completed: i, 
        current: property.name 
      });

      try {
        const result = await analyzeProperty(property.id, property.name);
        if (result) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        failCount++;
      }

      // Small delay between requests to avoid rate limiting
      if (i < properties.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    setProgress({ total: properties.length, completed: properties.length });
    setAnalyzing(false);

    if (successCount > 0) {
      toast.success(`Analyzed ${successCount} properties successfully`);
    }
    if (failCount > 0) {
      toast.error(`Failed to analyze ${failCount} properties`);
    }
  }, [analyzeProperty]);

  return {
    analyzing,
    progress,
    analyzeProperty,
    analyzeAllProperties,
  };
};
