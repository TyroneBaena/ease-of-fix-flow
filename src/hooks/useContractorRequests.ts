
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

        if (data) {
          const mappedRequests: MaintenanceRequest[] = data.map(item => ({
            id: item.id,
            title: item.title,
            status: item.status as 'pending' | 'in-progress' | 'completed',
            description: item.description,
            location: item.location,
            priority: item.priority as 'low' | 'medium' | 'high',
            site: item.site || undefined,
            submittedBy: item.submitted_by || undefined,
            contactNumber: undefined,
            address: undefined,
            practiceLeader: undefined,
            practiceLeaderPhone: undefined,
            attachments: item.attachments ? JSON.parse(JSON.stringify(item.attachments)) : undefined,
            quote: item.quoted_amount?.toString() || '',
            date: item.created_at
          }));
          
          setRequests(mappedRequests);

          if (mappedRequests.length === 0) {
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
