import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Loader2, AlertTriangle, RefreshCw, Building2, User, HelpCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MaintenanceRequest } from '@/types/maintenance';

interface ResponsibilitySuggestionCardProps {
  request: MaintenanceRequest;
}

interface AnalysisResult {
  responsibility: 'landlord' | 'tenant' | 'needs_review';
  urgency: 'urgent' | 'normal';
  assetType: string;
  reasoning: string;
  confidence: 'high' | 'medium' | 'low';
}

export const ResponsibilitySuggestionCard = ({ request }: ResponsibilitySuggestionCardProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeRequest = async () => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('analyze-responsibility', {
        body: {
          title: request.title,
          description: request.description,
          explanation: request.explanation,
          attemptedFix: request.attemptedFix,
          issueNature: request.issueNature,
          location: request.location,
          category: request.category,
        },
      });

      if (invokeError) {
        throw invokeError;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data);
    } catch (err) {
      console.error('Error analyzing request:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze request';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getResponsibilityBadge = (responsibility: string) => {
    switch (responsibility) {
      case 'landlord':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
            <Building2 className="h-3 w-3 mr-1" />
            Landlord Responsibility
          </Badge>
        );
      case 'tenant':
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            <User className="h-3 w-3 mr-1" />
            Tenant Responsibility
          </Badge>
        );
      case 'needs_review':
        return (
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
            <HelpCircle className="h-3 w-3 mr-1" />
            Needs Review
          </Badge>
        );
      default:
        return null;
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return <Badge variant="outline" className="text-emerald-600 border-emerald-300">High Confidence</Badge>;
      case 'medium':
        return <Badge variant="outline" className="text-amber-600 border-amber-300">Medium Confidence</Badge>;
      case 'low':
        return <Badge variant="outline" className="text-red-600 border-red-300">Low Confidence</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          AI Responsibility Suggestion
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!result && !isAnalyzing && (
          <div className="text-center py-2">
            <p className="text-sm text-muted-foreground mb-3">
              Analyze this request to determine if it's the landlord's or tenant's responsibility.
            </p>
            <Button 
              onClick={analyzeRequest} 
              variant="outline" 
              className="w-full"
              disabled={isAnalyzing}
            >
              <Lightbulb className="h-4 w-4 mr-2" />
              Analyze Request
            </Button>
          </div>
        )}

        {isAnalyzing && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
            <span className="text-sm text-muted-foreground">Analyzing request...</span>
          </div>
        )}

        {error && !isAnalyzing && (
          <div className="text-center py-2">
            <p className="text-sm text-destructive mb-3">{error}</p>
            <Button onClick={analyzeRequest} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        )}

        {result && !isAnalyzing && (
          <div className="space-y-4">
            {/* Urgency Alert */}
            {result.urgency === 'urgent' && (
              <div className="flex items-center gap-2 p-2 bg-red-50 rounded-md border border-red-200">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-700">URGENT - Immediate attention required</span>
              </div>
            )}

            {/* Responsibility Badge */}
            <div className="flex flex-wrap gap-2">
              {getResponsibilityBadge(result.responsibility)}
              {getConfidenceBadge(result.confidence)}
            </div>

            {/* Asset Type */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Asset Type</p>
              <p className="text-sm font-medium">{result.assetType.toLowerCase()}</p>
            </div>

            {/* Reasoning */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Reasoning</p>
              <p className="text-sm text-muted-foreground">{result.reasoning}</p>
            </div>

            {/* Re-analyze Button */}
            <Button 
              onClick={analyzeRequest} 
              variant="ghost" 
              size="sm" 
              className="w-full"
              disabled={isAnalyzing}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Re-analyze
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
