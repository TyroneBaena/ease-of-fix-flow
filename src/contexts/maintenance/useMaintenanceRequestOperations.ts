
import { supabase } from '@/lib/supabase';
import { MaintenanceRequest } from '@/types/maintenance';
import { toast } from '@/lib/toast';

export const useMaintenanceRequestOperations = (currentUser: any) => {
  
  const fetchRequests = async () => {
    console.log('🔍 ADMIN DEBUG - fetchRequests called');
    console.log('🔍 ADMIN DEBUG - currentUser:', currentUser);
    console.log('🔍 ADMIN DEBUG - currentUser.role:', currentUser?.role);
    console.log('🔍 ADMIN DEBUG - currentUser.id:', currentUser?.id);
    
    if (!currentUser) {
      console.log('🔍 ADMIN DEBUG - No current user, returning empty array');
      return [];
    }

    try {
      let query = supabase
        .from('maintenance_requests')
        .select('*')
        .order('created_at', { ascending: false });

      // Different filtering logic based on user role
      if (currentUser.role === 'admin') {
        console.log('🔍 ADMIN DEBUG - Admin user detected! Fetching ALL requests without filtering');
        // Admins see all requests in their organization (RLS handles organization filtering)
      } else if (currentUser.role === 'manager') {
        console.log('🔍 ADMIN DEBUG - Manager user detected! Filtering by assigned properties');
        // Managers see requests for properties they're assigned to
        const assignedProperties = currentUser.assignedProperties || [];
        if (assignedProperties.length > 0) {
          query = query.in('property_id', assignedProperties);
        } else {
          // If no assigned properties, fall back to user_id filtering
          query = query.eq('user_id', currentUser.id);
        }
      } else {
        console.log('🔍 ADMIN DEBUG - Non-admin user, filtering by user_id');
        query = query.eq('user_id', currentUser.id);
      }

      console.log('🔍 ADMIN DEBUG - About to execute query...');
      const { data, error } = await query;

      if (error) {
        console.error('🔍 ADMIN DEBUG - Error fetching requests:', error);
        throw error;
      }

      console.log('🔍 ADMIN DEBUG - Raw data from database:', data?.length, 'requests found');
      
      // Check specifically for add24 request
      const add24Request = data?.find(req => req.title?.includes('add24'));
      console.log('🔍 ADMIN DEBUG - add24 request found:', add24Request ? 'YES' : 'NO');

      return data || [];
    } catch (error) {
      console.error('🔍 ADMIN DEBUG - Error in fetchRequests:', error);
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
      // Get default budget category for organization
      const { data: defaultCategory } = await supabase
        .from('budget_categories')
        .select('id')
        .eq('organization_id', currentUser.organization_id)
        .eq('name', 'General Maintenance')
        .maybeSingle();

      // Prepare the data for insertion
      const insertData = {
        title: requestData.title || requestData.issueNature || 'Untitled Request',
        description: requestData.explanation || '',
        category: requestData.site || 'Unknown',
        location: requestData.location || 'Unknown',
        priority: requestData.priority || 'medium',
        status: 'pending',
        site: requestData.site || '',
        submitted_by: requestData.submittedBy || '',
        user_id: currentUser.id,
        organization_id: currentUser.organization_id,
        property_id: requestData.propertyId,
        budget_category_id: defaultCategory?.id || null,
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
        .maybeSingle();

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
