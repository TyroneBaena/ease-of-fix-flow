
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { MaintenanceRequest } from '@/types/maintenance';
import { isAttachmentArray, isHistoryArray } from '@/types/property';

export const useMaintenanceRequestOperations = (currentUser: any) => {
  const fetchRequests = async () => {
    try {
      console.log('Fetching maintenance requests...', currentUser?.id);
      if (!currentUser?.id) {
        console.log('No current user, returning empty array');
        return [];
      }
      
      // Only fetch requests owned by the current user
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('user_id', currentUser.id); // Filter by the current user's ID
      
      if (error) {
        console.error('Error fetching maintenance requests:', error);
        toast.error('Failed to fetch maintenance requests');
        return [];
      }

      console.log('Raw maintenance requests data:', data);
      const formattedRequests = data.map(formatRequestData);
      console.log('Formatted maintenance requests:', formattedRequests);
      return formattedRequests;
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

      // Ensure required fields are present
      const title = requestData.title || requestData.issueNature || 'Untitled Request';
      const location = requestData.location || '';
      const site = requestData.site || requestData.category || '';
      const submittedBy = requestData.submittedBy || currentUser.email || 'Anonymous';

      console.log('Adding maintenance request with data:', { ...requestData, title, location, site, submittedBy });

      const { data, error } = await supabase
        .from('maintenance_requests')
        .insert({
          title: title,
          description: requestData.description || requestData.explanation || '',
          category: requestData.category || site,
          location: location,
          priority: requestData.priority || 'medium',
          property_id: requestData.propertyId,
          user_id: currentUser.id,
          is_participant_related: requestData.isParticipantRelated || false,
          participant_name: requestData.participantName || 'N/A',
          attempted_fix: requestData.attemptedFix || '',
          issue_nature: requestData.issueNature || '',
          explanation: requestData.explanation || '',
          report_date: requestData.reportDate || new Date().toISOString().split('T')[0],
          site: site,
          submitted_by: submittedBy,
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding maintenance request:', error);
        toast.error('Failed to add maintenance request');
        return;
      }

      console.log('Successfully added maintenance request:', data);
      return formatRequestData(data);
    } catch (err) {
      console.error('Unexpected error adding maintenance request:', err);
      toast.error('An unexpected error occurred');
    }
  };

  const formatRequestData = (data: any): MaintenanceRequest => {
    console.log('Formatting request data:', data);
    
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

    // Map the database status to our application status
    let status = data.status || 'pending';
    
    // Ensure required fields have values
    const title = data.title || data.issue_nature || 'Untitled Request';
    const location = data.location || '';
    const site = data.site || data.category || '';
    const submittedBy = data.submitted_by || 'Anonymous';

    return {
      id: data.id,
      isParticipantRelated: data.is_participant_related || false,
      participantName: data.participant_name || 'N/A',
      attemptedFix: data.attempted_fix || '',
      issueNature: data.issue_nature || title,
      explanation: data.explanation || data.description || '',
      location: location,
      reportDate: data.report_date || data.created_at?.split('T')[0] || '',
      site: site,
      submittedBy: submittedBy,
      status: status,
      title: title,
      description: data.description || data.explanation || '',
      category: data.category || site,
      priority: data.priority || 'medium',
      propertyId: data.property_id,
      createdAt: data.created_at || new Date().toISOString(),
      updatedAt: data.updated_at,
      dueDate: data.due_date || undefined,
      assignedTo: data.assigned_to || undefined,
      attachments: processedAttachments,
      history: processedHistory,
      quote: data.quoted_amount ? `$${data.quoted_amount}` : undefined,
      contactNumber: data.contact_number || undefined,
      address: data.address || undefined,
      practiceLeader: data.practice_leader || undefined,
      practiceLeaderPhone: data.practice_leader_phone || undefined
    };
  };

  return {
    fetchRequests,
    addRequest,
  };
};
