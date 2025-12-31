import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw, 
  TrendingUp, 
  Wrench,
  Lightbulb,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PropertyInsight, PropertyInsightData, getRiskLevelColor, getRiskLevelLabel } from '@/types/propertyInsights';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface PropertyInsightsCardProps {
  propertyId: string;
  propertyName?: string;
  propertyAddress?: string;
}

const PropertyInsightsCard: React.FC<PropertyInsightsCardProps> = ({
  propertyId,
  propertyName,
  propertyAddress
}) => {
  const [insight, setInsight] = useState<PropertyInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [problemsOpen, setProblemsOpen] = useState(false);
  const [recommendationsOpen, setRecommendationsOpen] = useState(true);

  useEffect(() => {
    fetchInsight();
  }, [propertyId]);

  const fetchInsight = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('property_insights')
        .select('*')
        .eq('property_id', propertyId)
        .eq('insight_type', 'hotspot_analysis')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setInsight(data as unknown as PropertyInsight);
      }
    } catch (error) {
      console.error('Error fetching insight:', error);
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async () => {
    try {
      setAnalyzing(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to analyze property');
        return;
      }

      const response = await supabase.functions.invoke('analyze-property-hotspot', {
        body: {
          propertyId,
          propertyName,
          propertyAddress
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Analysis failed');
      }

      toast.success('Property analysis complete');
      await fetchInsight();
    } catch (error: any) {
      console.error('Error analyzing property:', error);
      toast.error(error.message || 'Failed to analyze property');
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Property Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const insightData = insight?.insight_data as PropertyInsightData | undefined;

  if (!insight || !insightData) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Property Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            No analysis available yet. Run an AI analysis to identify patterns and get recommendations.
          </p>
          <Button 
            size="sm" 
            onClick={runAnalysis} 
            disabled={analyzing}
            className="w-full"
          >
            {analyzing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <TrendingUp className="h-4 w-4 mr-2" />
                Analyze Property
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const lastAnalyzed = insight.updated_at 
    ? formatDistanceToNow(new Date(insight.updated_at), { addSuffix: true })
    : 'Unknown';

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Property Insights
          </CardTitle>
          <Badge className={getRiskLevelColor(insightData.riskLevel)}>
            {getRiskLevelLabel(insightData.riskLevel)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <p className="text-sm text-muted-foreground">
          {insightData.summary}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Analyzed {lastAnalyzed}
          </span>
          <span>
            {insightData.requestsAnalyzed} requests analyzed
          </span>
        </div>

        {/* Recurring Issues */}
        {insightData.recurringIssues.length > 0 && (
          <Collapsible open={recurringOpen} onOpenChange={setRecurringOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between p-2 h-auto">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Recurring Issues ({insightData.recurringIssues.length})
                </span>
                {recurringOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              {insightData.recurringIssues.map((issue, idx) => (
                <div key={idx} className="bg-muted/50 rounded-md p-2 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium capitalize">{issue.category}</span>
                    <Badge variant="outline" className="text-xs">
                      {issue.count}x
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{issue.pattern}</p>
                  {issue.locations.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Locations: {issue.locations.join(', ')}
                    </p>
                  )}
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Systemic Problems */}
        {insightData.systemicProblems.length > 0 && (
          <Collapsible open={problemsOpen} onOpenChange={setProblemsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between p-2 h-auto">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Wrench className="h-4 w-4 text-red-500" />
                  Systemic Problems ({insightData.systemicProblems.length})
                </span>
                {problemsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              {insightData.systemicProblems.map((problem, idx) => (
                <div key={idx} className="bg-muted/50 rounded-md p-2 text-sm">
                  <p className="font-medium">{problem.problem}</p>
                  <p className="text-xs text-muted-foreground mt-1">{problem.evidence}</p>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Recommendations */}
        {insightData.recommendations.length > 0 && (
          <Collapsible open={recommendationsOpen} onOpenChange={setRecommendationsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between p-2 h-auto">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  Recommendations ({insightData.recommendations.length})
                </span>
                {recommendationsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              {insightData.recommendations.map((rec, idx) => (
                <div key={idx} className="bg-muted/50 rounded-md p-2 text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        rec.priority === 'urgent' ? 'border-red-500 text-red-600' :
                        rec.priority === 'high' ? 'border-orange-500 text-orange-600' :
                        rec.priority === 'medium' ? 'border-yellow-500 text-yellow-600' :
                        'border-green-500 text-green-600'
                      }`}
                    >
                      {rec.priority}
                    </Badge>
                    <span className="font-medium">{rec.action}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{rec.reasoning}</p>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Re-analyze button */}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={runAnalysis} 
          disabled={analyzing}
          className="w-full"
        >
          {analyzing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Re-analyze
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default PropertyInsightsCard;
