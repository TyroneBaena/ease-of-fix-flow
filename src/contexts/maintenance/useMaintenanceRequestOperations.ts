
import { supabase } from '@/lib/supabase';
import { MaintenanceRequest } from '@/types/maintenance';
import { toast } from '@/lib/toast';

export const useMaintenanceRequestOperations = (currentUser: any) => {
  
  const fetchRequests = async () => {
    console.log('useMaintenanceRequestOperations - fetchRequests called for user:', currentUser?.id);
    
    if (!currentUser) {
      console.log('useMaintenanceRequestOperations - No current user, returning empty array');
      return [];
    }

    try {
      let query = supabase
        .from('maintenance_requests')
        .select('*')
        .order('created_at', { ascending: false });

      // If not admin, filter by user_id
      if (currentUser.role !== 'admin') {
        console.log('useMaintenanceRequestOperations - Non-admin user, filtering by user_id');
        query = query.eq('user_id', currentUser.id);
      } else {
        console.log('useMaintenanceRequestOperations - Admin user, fetching all requests');
      }

      const { data, error } = await query;

      if (error) {
        console.error('useMaintenanceRequestOperations - Error fetching requests:', error);
        throw error;
      }

      console.log('useMaintenanceRequestOperations - Raw data from database:', data);
      console.log('useMaintenanceRequestOperations - Number of requests found:', data?.length || 0);
      
      if (data && data.length > 0) {
        // Log attachments for each request
        data.forEach((request, index) => {
          console.log(`useMaintenanceRequestOperations - Request ${index + 1} attachments:`, {
            id: request.id,
            attachments: request.attachments,
            attachmentsType: typeof request.attachments
          });
        });
      }

      return data || [];
    } catch (error) {
      console.error('useMaintenanceRequestOperations - Error in fetchRequests:', error);
      return [];
    }
  };

  const addRequest = async (requestData: Omit<MaintenanceRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => {
    console.log('useMaintenanceRequestOperations - addRequest called');
    console.log('useMaintenanceRequestOperations - Request data received:', requestData);
    console.log('useMaintenanceRequestOperations - Attachments in request data:', requestData.attachments);
    
    if (!currentUser) {
      console.error('useMaintenanceRequestOperations - No current user for addRequest');
      toast.error('User not authenticated');
      return null;
    }

    try {
      // Prepare the data for insertion
      const insertData = {
        title: requestData.title || requestData.issueNature || 'Untitled Request',
        description: requestData.explanation || '',
        category: requestData.site || 'Unknown',
        location: requestData.location || 'Unknown',
        priority: 'medium',
        status: 'pending',
        site: requestData.site || '',
        submitted_by: requestData.submittedBy || '',
        user_id: currentUser.id,
        property_id: requestData.propertyId,
        is_participant_related: requestData.isParticipantRelated || false,
        participant_name: requestData.participantName || 'N/A',
        attempted_fix: requestData.attemptedFix || '',
        issue_nature: requestData.issueNature || '',
        explanation: requestData.explanation || '',
        report_date: requestData.reportDate || '',
        attachments: requestData.attachments // This should be the uploaded files array
      };

      console.log('useMaintenanceRequestOperations - Data prepared for database insertion:', insertData);
      console.log('useMaintenanceRequestOperations - Attachments being saved to DB:', insertData.attachments);
      console.log('useMaintenanceRequestOperations - Attachments type:', typeof insertData.attachments);
      console.log('useMaintenanceRequestOperations - Attachments stringified:', JSON.stringify(insertData.attachments));

      const { data, error } = await supabase
        .from('maintenance_requests')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('useMaintenanceRequestOperations - Database insert error:', error);
        throw error;
      }

      console.log('useMaintenanceRequestOperations - Database insert successful');
      console.log('useMaintenanceRequestOperations - Returned data from database:', data);
      console.log('useMaintenanceRequestOperations - Returned attachments from database:', data?.attachments);

      return data;
    } catch (error) {
      console.error('useMaintenanceRequestOperations - Error in addRequest:', error);
      toast.error('Failed to create maintenance request');
      return null;
    }
  };

  return {
    fetchRequests,
    addRequest
  };
};
