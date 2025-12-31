import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ChevronRight, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { PropertyInsight, PropertyInsightData, getRiskLevelColor } from '@/types/propertyInsights';

interface PropertyHotspot {
  propertyId: string;
  propertyName: string;
  propertyAddress: string;
  riskLevel: string;
  requestsAnalyzed: number;
  lastAnalyzed: string;
  topIssue?: string;
}

const PropertyHotspotsWidget: React.FC = () => {
  const [hotspots, setHotspots] = useState<PropertyHotspot[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchHotspots();
  }, []);

  const fetchHotspots = async () => {
    try {
      setLoading(true);
      
      // Fetch all property insights with high or critical risk
      const { data: insights, error: insightsError } = await supabase
        .from('property_insights')
        .select('*')
        .eq('insight_type', 'hotspot_analysis')
        .order('updated_at', { ascending: false });

      if (insightsError) throw insightsError;

      if (!insights || insights.length === 0) {
        setHotspots([]);
        return;
      }

      // Filter for high/critical and get property details
      const highRiskInsights = insights.filter((insight) => {
        const data = insight.insight_data as unknown as PropertyInsightData;
        return data?.riskLevel === 'high' || data?.riskLevel === 'critical';
      });

      if (highRiskInsights.length === 0) {
        setHotspots([]);
        return;
      }

      // Get property details
      const propertyIds = highRiskInsights.map(i => i.property_id);
      const { data: properties, error: propertiesError } = await supabase
        .from('properties')
        .select('id, name, address')
        .in('id', propertyIds);

      if (propertiesError) throw propertiesError;

      const propertyMap = new Map(properties?.map(p => [p.id, p]) || []);

      const formattedHotspots: PropertyHotspot[] = highRiskInsights
        .map((insight) => {
          const property = propertyMap.get(insight.property_id);
          const data = insight.insight_data as unknown as PropertyInsightData;
          
          if (!property) return null;

          return {
            propertyId: insight.property_id,
            propertyName: property.name,
            propertyAddress: property.address,
            riskLevel: data.riskLevel,
            requestsAnalyzed: data.requestsAnalyzed || 0,
            lastAnalyzed: insight.updated_at,
            topIssue: data.recurringIssues?.[0]?.category
          };
        })
        .filter(Boolean) as PropertyHotspot[];

      // Sort by risk level (critical first) and take top 5
      formattedHotspots.sort((a, b) => {
        if (a.riskLevel === 'critical' && b.riskLevel !== 'critical') return -1;
        if (a.riskLevel !== 'critical' && b.riskLevel === 'critical') return 1;
        return 0;
      });

      setHotspots(formattedHotspots.slice(0, 5));
    } catch (error) {
      console.error('Error fetching hotspots:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            Property Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (hotspots.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            Property Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            All properties are in good standing. No high-risk issues detected.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          Property Alerts
          <Badge variant="destructive" className="ml-auto">
            {hotspots.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {hotspots.map((hotspot) => (
          <Button
            key={hotspot.propertyId}
            variant="ghost"
            className="w-full justify-between h-auto py-2 px-3"
            onClick={() => navigate(`/properties/${hotspot.propertyId}`)}
          >
            <div className="text-left">
              <p className="font-medium text-sm">{hotspot.propertyName}</p>
              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                {hotspot.topIssue ? `Top issue: ${hotspot.topIssue}` : hotspot.propertyAddress}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getRiskLevelColor(hotspot.riskLevel)}>
                {hotspot.riskLevel}
              </Badge>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
};

export default PropertyHotspotsWidget;
