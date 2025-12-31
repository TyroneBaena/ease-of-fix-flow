import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { Sparkles, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface BulkCategorizationButtonProps {
  onComplete?: () => void;
}

const BulkCategorizationButton: React.FC<BulkCategorizationButtonProps> = ({ onComplete }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [processed, setProcessed] = useState(0);

  const handleBulkCategorize = async () => {
    setIsProcessing(true);
    setProgress(0);
    setProcessed(0);

    try {
      // Fetch requests that haven't been categorized yet
      const { data: uncategorizedRequests, error: fetchError } = await supabase
        .from('maintenance_requests')
        .select('id, title, description, location')
        .is('ai_issue_type', null)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      if (!uncategorizedRequests || uncategorizedRequests.length === 0) {
        toast.info('All requests are already categorized');
        setIsProcessing(false);
        return;
      }

      setTotal(uncategorizedRequests.length);
      toast.info(`Found ${uncategorizedRequests.length} requests to categorize`);

      let successCount = 0;
      let errorCount = 0;

      // Process requests one at a time to avoid rate limiting
      for (let i = 0; i < uncategorizedRequests.length; i++) {
        const request = uncategorizedRequests[i];
        
        try {
          const { data, error } = await supabase.functions.invoke('categorize-request', {
            body: {
              title: request.title || '',
              description: request.description || '',
              location: request.location || ''
            }
          });

          if (error) {
            console.error('Error categorizing request:', request.id, error);
            errorCount++;
          } else if (data?.issueType) {
            // Update the request with AI categorization
            const { error: updateError } = await supabase
              .from('maintenance_requests')
              .update({
                ai_issue_type: data.issueType,
                ai_issue_tags: data.issueTags || [],
                ai_affected_area: data.affectedArea,
                ai_categorized_at: new Date().toISOString(),
                ai_category_confidence: data.confidence || 'medium'
              })
              .eq('id', request.id);

            if (updateError) {
              console.error('Error updating request:', request.id, updateError);
              errorCount++;
            } else {
              successCount++;
            }
          }
        } catch (err) {
          console.error('Unexpected error for request:', request.id, err);
          errorCount++;
        }

        // Update progress
        const currentProgress = Math.round(((i + 1) / uncategorizedRequests.length) * 100);
        setProgress(currentProgress);
        setProcessed(i + 1);

        // Small delay to avoid overwhelming the API
        if (i < uncategorizedRequests.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully categorized ${successCount} requests`);
      }
      if (errorCount > 0) {
        toast.error(`Failed to categorize ${errorCount} requests`);
      }

      onComplete?.();
    } catch (error) {
      console.error('Bulk categorization error:', error);
      toast.error('Failed to start bulk categorization');
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setTotal(0);
      setProcessed(0);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={handleBulkCategorize}
        disabled={isProcessing}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        {isProcessing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {isProcessing ? 'Categorizing...' : 'AI Categorize Requests'}
      </Button>
      
      {isProcessing && total > 0 && (
        <div className="space-y-1">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground">
            Processing {processed} of {total} requests ({progress}%)
          </p>
        </div>
      )}
    </div>
  );
};

export default BulkCategorizationButton;
