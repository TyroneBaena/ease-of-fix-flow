import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PropertyInsightData } from '@/types/propertyInsights';

interface PropertyInsight {
  property_id: string;
  insight_data: PropertyInsightData;
  updated_at: string;
}

interface PropertyInsightStatus {
  propertyId: string;
  hasInsight: boolean;
  isStale: boolean;
  requestsSinceAnalysis: number;
  lastAnalyzed: string | null;
}

const STALE_THRESHOLD_DAYS = 7;
const NEW_REQUESTS_THRESHOLD = 5;

export const usePropertyInsights = () => {
  const [insights, setInsights] = useState<Map<string, PropertyInsight>>(new Map());
  const [loading, setLoading] = useState(true);

  const fetchInsights = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('property_insights')
        .select('property_id, insight_data, updated_at')
        .eq('insight_type', 'hotspot_analysis');

      if (error) throw error;

      const insightMap = new Map<string, PropertyInsight>();
      data?.forEach(item => {
        insightMap.set(item.property_id, {
          property_id: item.property_id,
          insight_data: item.insight_data as unknown as PropertyInsightData,
          updated_at: item.updated_at
        });
      });

      setInsights(insightMap);
    } catch (error) {
      console.error('Error fetching property insights:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const getInsightStatus = useCallback(async (propertyId: string): Promise<PropertyInsightStatus> => {
    const insight = insights.get(propertyId);
    
    if (!insight) {
      return {
        propertyId,
        hasInsight: false,
        isStale: false,
        requestsSinceAnalysis: 0,
        lastAnalyzed: null
      };
    }

    // Calculate days since last analysis
    const lastAnalyzed = new Date(insight.updated_at);
    const daysSinceAnalysis = Math.floor((Date.now() - lastAnalyzed.getTime()) / (1000 * 60 * 60 * 24));
    
    // Count requests since last analysis
    const { count, error } = await supabase
      .from('maintenance_requests')
      .select('*', { count: 'exact', head: true })
      .eq('property_id', propertyId)
      .gte('created_at', insight.updated_at);

    const requestsSinceAnalysis = error ? 0 : (count || 0);
    
    // Determine if stale
    const isStale = daysSinceAnalysis >= STALE_THRESHOLD_DAYS && requestsSinceAnalysis > 0;

    return {
      propertyId,
      hasInsight: true,
      isStale,
      requestsSinceAnalysis,
      lastAnalyzed: insight.updated_at
    };
  }, [insights]);

  const shouldTriggerAnalysis = useCallback(async (propertyId: string): Promise<boolean> => {
    const insight = insights.get(propertyId);
    
    // No insight exists - should analyze if there are requests
    if (!insight) {
      const { count } = await supabase
        .from('maintenance_requests')
        .select('*', { count: 'exact', head: true })
        .eq('property_id', propertyId);
      
      return (count || 0) >= 3; // Analyze if at least 3 requests
    }

    // Count requests since last analysis
    const { count } = await supabase
      .from('maintenance_requests')
      .select('*', { count: 'exact', head: true })
      .eq('property_id', propertyId)
      .gte('created_at', insight.updated_at);

    // Trigger if threshold met
    return (count || 0) >= NEW_REQUESTS_THRESHOLD;
  }, [insights]);

  const triggerBackgroundAnalysis = useCallback(async (propertyId: string, propertyName?: string) => {
    try {
      console.log(`🔄 Background analysis triggered for property: ${propertyName || propertyId}`);
      
      // Fire and forget - don't await
      supabase.functions.invoke('analyze-property-hotspot', {
        body: { propertyId }
      }).then(({ data, error }) => {
        if (error) {
          console.error('Background analysis failed:', error);
        } else {
          console.log(`✅ Background analysis complete for ${propertyName || propertyId}`);
          // Refresh insights after successful analysis
          fetchInsights();
        }
      });
    } catch (error) {
      console.error('Error triggering background analysis:', error);
    }
  }, [fetchInsights]);

  return {
    insights,
    loading,
    fetchInsights,
    getInsightStatus,
    shouldTriggerAnalysis,
    triggerBackgroundAnalysis
  };
};
