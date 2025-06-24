
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { MaintenanceRequest } from '@/types/maintenance';
import { toast } from '@/lib/toast';

interface EditRequestData {
  title?: string;
  description?: string;
  category?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  location?: string;
  issueNature?: string;
  explanation?: string;
  attemptedFix?: string;
  isParticipantRelated?: boolean;
  participantName?: string;
  reportDate?: string;
  submittedBy?: string;
  budgetCategoryId?: string;
}

export const useEditRequest = () => {
  const [isUpdating, setIsUpdating] = useState(false);

  const updateRequest = async (requestId: string, updateData: EditRequestData): Promise<MaintenanceRequest | null> => {
    console.log('useEditRequest - updateRequest called with:', { requestId, updateData });
    
    setIsUpdating(true);
    
    try {
      // Prepare the update data for the database
      const dbUpdateData: any = {};
      
      if (updateData.title !== undefined) dbUpdateData.title = updateData.title;
      if (updateData.description !== undefined) dbUpdateData.description = updateData.description;
      if (updateData.category !== undefined) dbUpdateData.category = updateData.category;
      if (updateData.priority !== undefined) dbUpdateData.priority = updateData.priority;
      if (updateData.location !== undefined) dbUpdateData.location = updateData.location;
      if (updateData.issueNature !== undefined) dbUpdateData.issue_nature = updateData.issueNature;
      if (updateData.explanation !== undefined) dbUpdateData.explanation = updateData.explanation;
      if (updateData.attemptedFix !== undefined) dbUpdateData.attempted_fix = updateData.attemptedFix;
      if (updateData.isParticipantRelated !== undefined) dbUpdateData.is_participant_related = updateData.isParticipantRelated;
      if (updateData.participantName !== undefined) dbUpdateData.participant_name = updateData.participantName;
      if (updateData.reportDate !== undefined) dbUpdateData.report_date = updateData.reportDate;
      if (updateData.submittedBy !== undefined) dbUpdateData.submitted_by = updateData.submittedBy;
      if (updateData.budgetCategoryId !== undefined) dbUpdateData.budget_category_id = updateData.budgetCategoryId;
      
      // Add updated timestamp
      dbUpdateData.updated_at = new Date().toISOString();
      
      console.log('useEditRequest - Database update data:', dbUpdateData);
      
      const { data, error } = await supabase
        .from('maintenance_requests')
        .update(dbUpdateData)
        .eq('id', requestId)
        .select()
        .single();
      
      if (error) {
        console.error('useEditRequest - Database update error:', error);
        throw error;
      }
      
      console.log('useEditRequest - Update successful:', data);
      toast.success('Request updated successfully');
      return data;
      
    } catch (error) {
      console.error('useEditRequest - Error updating request:', error);
      toast.error('Failed to update request');
      return null;
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    updateRequest,
    isUpdating
  };
};
