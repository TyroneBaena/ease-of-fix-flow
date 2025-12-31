import React, { useState } from 'react';
import { Brain, Sparkles, Tag, MapPin, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface AICategoryInfoProps {
  requestId: string;
  title: string;
  description: string;
  location?: string;
  aiIssueType?: string | null;
  aiIssueTags?: string[] | null;
  aiAffectedArea?: string | null;
  aiCategoryConfidence?: string | null;
  onCategorized?: () => void;
}

const formatIssueType = (issueType: string): string => {
  return issueType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const getConfidenceColor = (confidence: string | null | undefined): string => {
  switch (confidence) {
    case 'high':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'low':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export const AICategoryInfo = ({
  requestId,
  title,
  description,
  location,
  aiIssueType,
  aiIssueTags,
  aiAffectedArea,
  aiCategoryConfidence,
  onCategorized
}: AICategoryInfoProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleCategorize = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('categorize-request', {
        body: { title, description, location }
      });

      if (error) throw error;

      const { error: updateError } = await supabase
        .from('maintenance_requests')
        .update({
          ai_issue_type: data.issueType,
          ai_issue_tags: data.issueTags,
          ai_affected_area: data.affectedArea,
          ai_category_confidence: data.confidence,
          ai_categorized_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      toast.success('Request categorized successfully');
      onCategorized?.();
    } catch (error) {
      console.error('Error categorizing request:', error);
      toast.error('Failed to categorize request');
    } finally {
      setIsLoading(false);
    }
  };

  if (!aiIssueType) {
    return (
      <div className="flex items-center">
        <Brain className="h-4 w-4 text-muted-foreground mr-2" />
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">AI Category</p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Not categorized</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCategorize}
              disabled={isLoading}
              className="h-6 px-2 text-xs"
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <Sparkles className="h-3 w-3 mr-1" />
                  Categorize
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="col-span-1 sm:col-span-2 space-y-3">
      <div className="flex items-start gap-2">
        <Brain className="h-4 w-4 text-primary mt-0.5" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs text-muted-foreground">AI Category</p>
            {aiCategoryConfidence && (
              <Badge variant="outline" className={`text-xs ${getConfidenceColor(aiCategoryConfidence)}`}>
                {aiCategoryConfidence} confidence
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-primary/10 text-primary border-primary/20">
              {formatIssueType(aiIssueType)}
            </Badge>
            
            {aiAffectedArea && (
              <Badge variant="outline" className="text-xs">
                <MapPin className="h-3 w-3 mr-1" />
                {aiAffectedArea}
              </Badge>
            )}
          </div>

          {aiIssueTags && aiIssueTags.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              <Tag className="h-3 w-3 text-muted-foreground" />
              {aiIssueTags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
