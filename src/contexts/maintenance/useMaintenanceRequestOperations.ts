
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { MaintenanceRequest, isAttachmentArray, isHistoryArray } from '@/types/property';

export const useMaintenanceRequestOperations = (currentUser: any) => {
  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select('*');

      if (error) {
        console.error('Error fetching maintenance requests:', error);
        toast.error('Failed to fetch maintenance requests');
        return [];
      }

      return data.map(formatRequestData);
    } catch (err) {
      console.error('Unexpected error fetching requests:', err);
      toast.error('An unexpected error occurred');
      return [];
    }
  };

  const addRequest = async (requestData: Omit<MaintenanceRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (!currentUser) {
        toast.error('You must be logged in to add a request');
        return;
      }

      const { data, error } = await supabase
        .from('maintenance_requests')
        .insert({
          title: requestData.title || requestData.issueNature,
          description: requestData.description || requestData.explanation,
          category: requestData.category || requestData.site,
          location: requestData.location,
          priority: requestData.priority || 'medium',
          property_id: requestData.propertyId,
          user_id: currentUser.id,
          is_participant_related: requestData.isParticipantRelated,
          participant_name: requestData.participantName,
          attempted_fix: requestData.attemptedFix,
          issue_nature: requestData.issueNature,
          explanation: requestData.explanation,
          report_date: requestData.reportDate,
          site: requestData.site,
          submitted_by: requestData.submittedBy,
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding maintenance request:', error);
        toast.error('Failed to add maintenance request');
        return;
      }

      return formatRequestData(data);
    } catch (err) {
      console.error('Unexpected error adding maintenance request:', err);
      toast.error('An unexpected error occurred');
    }
  };

  const formatRequestData = (data: any): MaintenanceRequest => {
    let processedAttachments = null;
    if (data.attachments) {
      if (isAttachmentArray(data.attachments)) {
        processedAttachments = data.attachments;
      }
    }

    let processedHistory = null;
    if (data.history) {
      if (isHistoryArray(data.history)) {
        processedHistory = data.history;
      }
    }

    return {
      id: data.id,
      isParticipantRelated: data.is_participant_related || false,
      participantName: data.participant_name || 'N/A',
      attemptedFix: data.attempted_fix || '',
      issueNature: data.issue_nature || data.title || '',
      explanation: data.explanation || data.description || '',
      location: data.location || '',
      reportDate: data.report_date || data.created_at.split('T')[0],
      site: data.site || data.category || '',
      submittedBy: data.submitted_by || '',
      status: data.status,
      title: data.title,
      description: data.description,
      category: data.category,
      priority: data.priority,
      propertyId: data.property_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      dueDate: data.due_date || undefined,
      assignedTo: data.assigned_to || undefined,
      attachments: processedAttachments,
      history: processedHistory
    };
  };

  return {
    fetchRequests,
    addRequest,
  };
};
