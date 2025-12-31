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
  requestsSinceAnalysis: number;
  isStale: boolean;
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

      // Get request counts per property (total and since last analysis)
      const { data: allRequests, error: requestsError } = await supabase
        .from('maintenance_requests')
        .select('property_id, created_at')
        .not('property_id', 'is', null);

      if (requestsError) throw requestsError;

      // Map insights by property_id
      const insightMap = new Map(
        insights?.map(i => [i.property_id, i]) || []
      );

      // Count requests per property (total and since last analysis)
      const countMap = new Map<string, { total: number; sinceLast: number }>();
      allRequests?.forEach(req => {
        if (req.property_id) {
          const insight = insightMap.get(req.property_id);
          const current = countMap.get(req.property_id) || { total: 0, sinceLast: 0 };
          current.total++;
          
          // Count requests since last analysis
          if (insight?.updated_at && new Date(req.created_at) > new Date(insight.updated_at)) {
            current.sinceLast++;
          } else if (!insight) {
            current.sinceLast = current.total; // All requests are "new" if no analysis
          }
          
          countMap.set(req.property_id, current);
        }
      });

      // Build health items for all properties
      const healthItems: PropertyHealthItem[] = properties.map(property => {
        const insight = insightMap.get(property.id);
        const insightData = insight?.insight_data as unknown as PropertyInsightData | undefined;
        const counts = countMap.get(property.id) || { total: 0, sinceLast: 0 };
        
        // Calculate staleness
        let isStale = false;
        if (insight?.updated_at) {
          const daysSinceAnalysis = Math.floor((Date.now() - new Date(insight.updated_at).getTime()) / (1000 * 60 * 60 * 24));
          isStale = daysSinceAnalysis >= 7 && counts.sinceLast > 0;
        }
        
        return {
          id: property.id,
          name: property.name,
          address: property.address,
          riskLevel: insightData?.riskLevel || null,
          requestCount: counts.total,
          lastAnalyzed: insight?.updated_at || null,
          topIssue: insightData?.recurringIssues?.[0]?.category,
          hasInsight: !!insight,
          requestsSinceAnalysis: counts.sinceLast,
          isStale
        };
      });

      // Sort: critical first, then high, then stale/unanalyzed with requests, then by request count
      healthItems.sort((a, b) => {
        const riskOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
        
        // Stale insights should be prioritized higher
        const aEffectiveRisk = a.riskLevel 
          ? (a.isStale ? Math.max(0, riskOrder[a.riskLevel] - 0.5) : riskOrder[a.riskLevel]) 
          : (a.requestCount > 0 ? 2.5 : 5);
        const bEffectiveRisk = b.riskLevel 
          ? (b.isStale ? Math.max(0, riskOrder[b.riskLevel] - 0.5) : riskOrder[b.riskLevel]) 
          : (b.requestCount > 0 ? 2.5 : 5);
        
        if (aEffectiveRisk !== bEffectiveRisk) return aEffectiveRisk - bEffectiveRisk;
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
    // Prioritize: stale > unanalyzed > all with requests
    const staleProperties = propertyHealth.filter(p => p.isStale);
    const unanalyzedWithRequests = propertyHealth.filter(p => !p.hasInsight && p.requestCount > 0);
    
    if (staleProperties.length > 0) {
      analyzeAllProperties(staleProperties.map(p => ({ id: p.id, name: p.name })));
    } else if (unanalyzedWithRequests.length > 0) {
      analyzeAllProperties(unanalyzedWithRequests.map(p => ({ id: p.id, name: p.name })));
    } else {
      const allWithRequests = propertyHealth.filter(p => p.requestCount > 0);
      analyzeAllProperties(allWithRequests.map(p => ({ id: p.id, name: p.name })));
    }
  };

  const getRiskIcon = (property: PropertyHealthItem) => {
    const { riskLevel, hasInsight, requestCount, isStale } = property;
    
    if (!hasInsight) {
      if (requestCount > 0) {
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
      }
      return <Building2 className="h-4 w-4 text-muted-foreground" />;
    }
    
    // Show warning icon for stale insights
    if (isStale) {
      return <RefreshCw className="h-4 w-4 text-yellow-500" />;
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

  const getRiskBadge = (property: PropertyHealthItem) => {
    const { riskLevel, hasInsight, requestCount, isStale, requestsSinceAnalysis } = property;
    
    if (!hasInsight) {
      if (requestCount > 0) {
        return <Badge variant="outline" className="text-xs">Not Analyzed</Badge>;
      }
      return <Badge variant="outline" className="text-xs text-muted-foreground">No Requests</Badge>;
    }
    
    // Show stale badge with new request count
    if (isStale) {
      return (
        <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-300">
          +{requestsSinceAnalysis} new
        </Badge>
      );
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
    needsAnalysis: propertyHealth.filter(p => !p.hasInsight && p.requestCount > 0).length,
    stale: propertyHealth.filter(p => p.isStale).length
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
          <div className="flex flex-wrap gap-4 mt-3 text-sm">
            {stats.highRisk > 0 && (
              <div className="flex items-center gap-1.5 text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>{stats.highRisk} High Risk</span>
              </div>
            )}
            {stats.stale > 0 && (
              <div className="flex items-center gap-1.5 text-yellow-600">
                <RefreshCw className="h-3.5 w-3.5" />
                <span>{stats.stale} Outdated</span>
              </div>
            )}
            {stats.needsAnalysis > 0 && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>{stats.needsAnalysis} Unanalyzed</span>
              </div>
            )}
            {stats.highRisk === 0 && stats.needsAnalysis === 0 && stats.stale === 0 && stats.analyzed > 0 && (
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
          
          {/* Analyze Button - shows for stale or unanalyzed properties */}
          {!analyzing && (stats.stale > 0 || stats.needsAnalysis > 0) && (
            <Button 
              variant="outline" 
              className="w-full justify-center gap-2"
              onClick={handleAnalyzeAll}
            >
              <RefreshCw className="h-4 w-4" />
              {stats.stale > 0 
                ? `Update ${stats.stale} Outdated`
                : `Analyze ${stats.needsAnalysis} Properties`
              }
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
                    {getRiskIcon(property)}
                    <div className="text-left">
                      <p className="font-medium text-sm">{property.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {property.isStale
                          ? `${property.requestsSinceAnalysis} new since analysis`
                          : property.topIssue 
                            ? `Top: ${property.topIssue}` 
                            : property.requestCount > 0 
                              ? `${property.requestCount} requests`
                              : property.address.substring(0, 35) + (property.address.length > 35 ? '...' : '')
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getRiskBadge(property)}
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
