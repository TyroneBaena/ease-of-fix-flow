import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  ChevronRight, 
  Building2, 
  Plus, 
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { PropertyInsightData, getRiskLevelColor } from '@/types/propertyInsights';
import { usePropertyContext } from '@/contexts/property/PropertyContext';
import { usePropertyAccessControl } from '@/hooks/usePropertyAccessControl';
import { usePropertyAnalysis } from '@/hooks/usePropertyAnalysis';
import { useUserContext } from '@/contexts/UnifiedAuthContext';
import { PropertyBillingAlert } from '@/components/billing/PropertyBillingAlert';

interface PropertyHealthItem {
  id: string;
  name: string;
  address: string;
  riskLevel: string | null;
  requestCount: number;
  lastAnalyzed: string | null;
  topIssue?: string;
  hasInsight: boolean;
}

const PropertyHealthWidget: React.FC = () => {
  const [propertyHealth, setPropertyHealth] = useState<PropertyHealthItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { properties, loading: propertiesLoading } = usePropertyContext();
  const { currentUser } = useUserContext();
  const { canCreateProperty, handleRestrictedAction } = usePropertyAccessControl();
  const { analyzing, progress, analyzeAllProperties } = usePropertyAnalysis();
  
  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (!propertiesLoading && properties.length > 0) {
      fetchPropertyHealth();
    } else if (!propertiesLoading && properties.length === 0) {
      setLoading(false);
    }
  }, [properties, propertiesLoading]);

  const fetchPropertyHealth = async () => {
    try {
      setLoading(true);
      
      // Get all property insights
      const { data: insights, error: insightsError } = await supabase
        .from('property_insights')
        .select('property_id, insight_data, updated_at')
        .eq('insight_type', 'hotspot_analysis');

      if (insightsError) throw insightsError;

      // Get request counts per property
      const { data: requestCounts, error: countError } = await supabase
        .from('maintenance_requests')
        .select('property_id')
        .not('property_id', 'is', null);

      if (countError) throw countError;

      // Count requests per property
      const countMap = new Map<string, number>();
      requestCounts?.forEach(req => {
        if (req.property_id) {
          countMap.set(req.property_id, (countMap.get(req.property_id) || 0) + 1);
        }
      });

      // Map insights by property_id
      const insightMap = new Map(
        insights?.map(i => [i.property_id, i]) || []
      );

      // Build health items for all properties
      const healthItems: PropertyHealthItem[] = properties.map(property => {
        const insight = insightMap.get(property.id);
        const insightData = insight?.insight_data as unknown as PropertyInsightData | undefined;
        
        return {
          id: property.id,
          name: property.name,
          address: property.address,
          riskLevel: insightData?.riskLevel || null,
          requestCount: countMap.get(property.id) || 0,
          lastAnalyzed: insight?.updated_at || null,
          topIssue: insightData?.recurringIssues?.[0]?.category,
          hasInsight: !!insight
        };
      });

      // Sort: critical first, then high, then unanalyzed with requests, then by request count
      healthItems.sort((a, b) => {
        const riskOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
        const aRisk = a.riskLevel ? riskOrder[a.riskLevel] ?? 4 : (a.requestCount > 0 ? 2.5 : 5);
        const bRisk = b.riskLevel ? riskOrder[b.riskLevel] ?? 4 : (b.requestCount > 0 ? 2.5 : 5);
        
        if (aRisk !== bRisk) return aRisk - bRisk;
        return b.requestCount - a.requestCount;
      });

      setPropertyHealth(healthItems);
    } catch (error) {
      console.error('Error fetching property health:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProperty = () => {
    if (!canCreateProperty) {
      handleRestrictedAction('create property');
      return;
    }
    navigate('/properties');
  };

  const handleAnalyzeAll = () => {
    const unanalyzedWithRequests = propertyHealth.filter(p => !p.hasInsight && p.requestCount > 0);
    if (unanalyzedWithRequests.length === 0) {
      // If all with requests are analyzed, re-analyze all
      const allWithRequests = propertyHealth.filter(p => p.requestCount > 0);
      analyzeAllProperties(allWithRequests.map(p => ({ id: p.id, name: p.name })));
    } else {
      analyzeAllProperties(unanalyzedWithRequests.map(p => ({ id: p.id, name: p.name })));
    }
  };

  const getRiskIcon = (riskLevel: string | null, hasInsight: boolean, requestCount: number) => {
    if (!hasInsight) {
      if (requestCount > 0) {
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
      }
      return <Building2 className="h-4 w-4 text-muted-foreground" />;
    }
    
    switch (riskLevel) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'medium':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'low':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      default:
        return <Building2 className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRiskBadge = (riskLevel: string | null, hasInsight: boolean, requestCount: number) => {
    if (!hasInsight) {
      if (requestCount > 0) {
        return <Badge variant="outline" className="text-xs">Not Analyzed</Badge>;
      }
      return <Badge variant="outline" className="text-xs text-muted-foreground">No Requests</Badge>;
    }
    
    return (
      <Badge className={`text-xs ${getRiskLevelColor(riskLevel || '')}`}>
        {riskLevel ? riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1) : 'Unknown'}
      </Badge>
    );
  };

  // Calculate stats
  const stats = {
    total: propertyHealth.length,
    analyzed: propertyHealth.filter(p => p.hasInsight).length,
    highRisk: propertyHealth.filter(p => p.riskLevel === 'high' || p.riskLevel === 'critical').length,
    needsAnalysis: propertyHealth.filter(p => !p.hasInsight && p.requestCount > 0).length
  };

  if (loading || propertiesLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Property Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Billing alert for admins */}
      {isAdmin && <PropertyBillingAlert />}
      
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Property Health
              <Badge variant="secondary" className="ml-2">
                {stats.total}
              </Badge>
            </CardTitle>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => navigate('/properties')}
              >
                View All
              </Button>
              {canCreateProperty && (
                <Button 
                  size="sm" 
                  onClick={handleAddProperty}
                  className="flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Add
                </Button>
              )}
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="flex gap-4 mt-3 text-sm">
            {stats.highRisk > 0 && (
              <div className="flex items-center gap-1.5 text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>{stats.highRisk} High Risk</span>
              </div>
            )}
            {stats.needsAnalysis > 0 && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>{stats.needsAnalysis} Need Analysis</span>
              </div>
            )}
            {stats.highRisk === 0 && stats.needsAnalysis === 0 && stats.analyzed > 0 && (
              <div className="flex items-center gap-1.5 text-green-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>All properties healthy</span>
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {/* Analysis Progress */}
          {analyzing && progress && (
            <div className="p-3 bg-muted/50 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing {progress.current || '...'}
                </span>
                <span className="text-muted-foreground">
                  {progress.completed}/{progress.total}
                </span>
              </div>
              <Progress value={(progress.completed / progress.total) * 100} className="h-2" />
            </div>
          )}
          
          {/* Analyze All Button */}
          {!analyzing && stats.needsAnalysis > 0 && (
            <Button 
              variant="outline" 
              className="w-full justify-center gap-2"
              onClick={handleAnalyzeAll}
            >
              <RefreshCw className="h-4 w-4" />
              Analyze {stats.needsAnalysis} Properties
            </Button>
          )}

          {/* Empty State */}
          {properties.length === 0 && (
            <div className="text-center py-6">
              <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-3">
                No properties added yet
              </p>
              {canCreateProperty && (
                <Button size="sm" onClick={handleAddProperty}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Your First Property
                </Button>
              )}
            </div>
          )}

          {/* Property List */}
          {propertyHealth.length > 0 && (
            <div className="space-y-1">
              {propertyHealth.slice(0, 5).map((property) => (
                <Button
                  key={property.id}
                  variant="ghost"
                  className="w-full justify-between h-auto py-2.5 px-3 hover:bg-muted/50"
                  onClick={() => navigate(`/properties/${property.id}`)}
                >
                  <div className="flex items-center gap-3">
                    {getRiskIcon(property.riskLevel, property.hasInsight, property.requestCount)}
                    <div className="text-left">
                      <p className="font-medium text-sm">{property.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {property.topIssue 
                          ? `Top: ${property.topIssue}` 
                          : property.requestCount > 0 
                            ? `${property.requestCount} requests`
                            : property.address.substring(0, 35) + (property.address.length > 35 ? '...' : '')
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getRiskBadge(property.riskLevel, property.hasInsight, property.requestCount)}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Button>
              ))}
              
              {propertyHealth.length > 5 && (
                <Button
                  variant="ghost"
                  className="w-full justify-center text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => navigate('/properties')}
                >
                  View all {propertyHealth.length} properties
                  <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PropertyHealthWidget;
