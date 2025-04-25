
import { useState, useEffect } from 'react';
import { MaintenanceRequest } from '@/types/maintenance';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export const useContractorRequests = () => {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuoteRequests = async () => {
      setIsLoading(true);
      setError(null);

      try {
        console.log('Fetching maintenance requests with quote_requested flag...');
        const { data, error } = await supabase
          .from('maintenance_requests')
          .select('*')
          .eq('quote_requested', true);
        
        if (error) {
          console.error('Error fetching requests:', error);
          setError(error.message);
          toast.error('Failed to fetch maintenance requests');
          return;
        }

        console.log('Raw maintenance requests data:', data);

        if (data) {
          const mappedRequests: MaintenanceRequest[] = data.map(item => {
            // Process attachments to ensure they match the expected type
            let processedAttachments: Array<{ url: string }> | null = null;
            if (item.attachments) {
              try {
                if (Array.isArray(item.attachments)) {
                  processedAttachments = item.attachments.map((attachment: any) => {
                    // If it's already in the right format, return as is
                    if (typeof attachment === 'object' && 'url' in attachment) {
                      return attachment as { url: string };
                    }
                    // If it's a string, wrap it in an object
                    return { url: String(attachment) };
                  });
                }
              } catch (err) {
                console.error('Failed to process attachments:', err);
              }
            }

            // Process history to ensure it matches the expected type
            let processedHistory: Array<{ action: string; timestamp: string }> | null = null;
            if (item.history && Array.isArray(item.history)) {
              try {
                processedHistory = item.history.map((h: any) => ({
                  action: h.action || '',
                  timestamp: h.timestamp || ''
                }));
              } catch (err) {
                console.error('Failed to process history:', err);
              }
            }

            return {
              id: item.id,
              title: item.title || item.issue_nature || 'Untitled Request',
              description: item.description || item.explanation,
              status: item.status as 'pending' | 'in-progress' | 'completed',
              priority: item.priority as 'low' | 'medium' | 'high',
              location: item.location,
              site: item.site || item.category,
              submittedBy: item.submitted_by || 'Anonymous',
              propertyId: item.property_id,
              createdAt: item.created_at,
              updatedAt: item.updated_at,
              category: item.category,
              assignedTo: item.assigned_to,
              dueDate: item.due_date,
              attachments: processedAttachments,
              history: processedHistory,
              isParticipantRelated: item.is_participant_related,
              participantName: item.participant_name,
              attemptedFix: item.attempted_fix,
              issueNature: item.issue_nature,
              explanation: item.explanation,
              reportDate: item.report_date,
              date: item.created_at, // For compatibility with the RequestsTable component
              quote: item.quoted_amount ? `$${item.quoted_amount}` : 'No quote'
            };
          });
          
          console.log('Mapped maintenance requests:', mappedRequests);
          setRequests(mappedRequests);

          if (mappedRequests.length === 0) {
            console.log('No maintenance requests found with quote_requested flag');
            toast.info('No quote-requested maintenance requests found');
          }
        }
      } catch (catchError) {
        console.error('Unexpected error fetching requests:', catchError);
        setError(String(catchError));
        toast.error('An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuoteRequests();
  }, []);

  return { requests, isLoading, error };
};
