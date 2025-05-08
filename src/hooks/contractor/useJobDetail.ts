
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { MaintenanceRequest } from '@/types/maintenance';
import { toast } from '@/lib/toast';

export const useJobDetail = (jobId: string | undefined) => {
  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<MaintenanceRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!jobId) return;
    
    const fetchJobDetails = async () => {
      try {
        setLoading(true);
        
        // Fetch the job details along with the related property to get the contact information
        const { data, error } = await supabase
          .from('maintenance_requests')
          .select(`
            *,
            quotes(*),
            property:property_id(
              address,
              contact_number,
              practice_leader,
              practice_leader_phone
            )
          `)
          .eq('id', jobId)
          .single();
          
        if (error) throw error;
        
        if (data) {
          // Helper function to safely handle potentially non-array JSON fields
          const safeArrayFromJSON = (jsonField: any): any[] => {
            if (!jsonField) return [];
            if (Array.isArray(jsonField)) return jsonField;
            try {
              const parsed = typeof jsonField === 'string' ? JSON.parse(jsonField) : jsonField;
              return Array.isArray(parsed) ? parsed : [];
            } catch (e) {
              console.warn('Failed to parse JSON array:', e);
              return [];
            }
          };
          
          // Extract property information from the join
          const propertyInfo = data.property || {};
          
          const formattedJob: MaintenanceRequest = {
            id: data.id,
            title: data.title,
            description: data.description || data.explanation || '',
            status: data.status as 'pending' | 'in-progress' | 'completed' | 'open',
            location: data.location || '',
            priority: data.priority as 'low' | 'medium' | 'high' || 'medium',
            site: data.site || data.category || '',
            submittedBy: data.submitted_by || 'Unknown',
            date: data.created_at,
            propertyId: data.property_id,
            contactNumber: propertyInfo.contact_number || '',
            address: propertyInfo.address || '',
            practiceLeader: propertyInfo.practice_leader || '',
            practiceLeaderPhone: propertyInfo.practice_leader_phone || '',
            attachments: safeArrayFromJSON(data.attachments),
            category: data.category,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            dueDate: data.due_date,
            assignedTo: data.assigned_to,
            history: safeArrayFromJSON(data.history),
            isParticipantRelated: data.is_participant_related || false,
            participantName: data.participant_name || 'N/A',
            attemptedFix: data.attempted_fix || '',
            issueNature: data.issue_nature || '',
            explanation: data.explanation || '',
            reportDate: data.report_date || '',
            contractorId: data.contractor_id,
            assignedAt: data.assigned_at,
            completionPercentage: data.completion_percentage || 0,
            completionPhotos: safeArrayFromJSON(data.completion_photos),
            progressNotes: safeArrayFromJSON(data.progress_notes),
            quoteRequested: data.quote_requested || false,
            quotedAmount: data.quoted_amount,
            quotes: data.quotes && data.quotes.length > 0 ? data.quotes : undefined
          };
          
          setJob(formattedJob);
        } else {
          setError('Job not found');
        }
      } catch (err) {
        console.error('Error fetching job details:', err);
        setError('Failed to load job details');
        toast.error('Failed to load job details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchJobDetails();
  }, [jobId]);
  
  return { job, loading, error };
};
