
import { useState, useEffect } from 'react';
import { MaintenanceRequest } from '@/types/property';
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
          const mappedRequests = data.map(item => ({
            id: item.id,
            title: item.title || item.issue_nature,
            description: item.description || item.explanation,
            status: item.status as 'pending' | 'in-progress' | 'completed',
            priority: item.priority as 'low' | 'medium' | 'high',
            location: item.location,
            site: item.site || item.category,
            submittedBy: item.submitted_by,
            propertyId: item.property_id,
            createdAt: item.created_at,
            updatedAt: item.updated_at,
            category: item.category,
            assignedTo: item.assigned_to,
            dueDate: item.due_date,
            attachments: item.attachments,
            history: item.history,
            isParticipantRelated: item.is_participant_related,
            participantName: item.participant_name,
            attemptedFix: item.attempted_fix,
            issueNature: item.issue_nature,
            explanation: item.explanation,
            reportDate: item.report_date
          }));
          
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
