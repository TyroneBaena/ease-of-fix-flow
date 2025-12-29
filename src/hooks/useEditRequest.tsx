
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { MaintenanceRequest } from '@/types/maintenance';
import { toast } from '@/lib/toast';
import { useMaintenanceRequestContext } from '@/contexts/maintenance';

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

// Transform database response to MaintenanceRequest type
const transformDbToMaintenanceRequest = (dbData: any): MaintenanceRequest => {
  return {
    id: dbData.id,
    title: dbData.title,
    description: dbData.description,
    status: dbData.status,
    location: dbData.location,
    priority: dbData.priority,
    site: dbData.site || '',
    submittedBy: dbData.submitted_by || '',
    category: dbData.category,
    createdAt: dbData.created_at,
    updatedAt: dbData.updated_at,
    isParticipantRelated: dbData.is_participant_related || false,
    participantName: dbData.participant_name || '',
    attemptedFix: dbData.attempted_fix || '',
    issueNature: dbData.issue_nature || '',
    explanation: dbData.explanation || '',
    reportDate: dbData.report_date || '',
    userId: dbData.user_id,
    propertyId: dbData.property_id,
    contractorId: dbData.contractor_id,
    assignedAt: dbData.assigned_at,
    completionPercentage: dbData.completion_percentage,
    completionPhotos: dbData.completion_photos,
    progressNotes: dbData.progress_notes,
    quoteRequested: dbData.quote_requested,
    quotedAmount: dbData.quoted_amount,
    attachments: dbData.attachments,
    history: dbData.history,
    dueDate: dbData.due_date,
    assignedTo: dbData.assigned_to,
    invoice_id: dbData.invoice_id,
    // AI Responsibility Suggestion
    aiResponsibilitySuggestion: dbData.ai_responsibility_suggestion || null,
    aiResponsibilityUrgency: dbData.ai_responsibility_urgency || null,
    aiResponsibilityAssetType: dbData.ai_responsibility_asset_type || null,
    aiResponsibilityReasoning: dbData.ai_responsibility_reasoning || null,
    aiResponsibilityConfidence: dbData.ai_responsibility_confidence || null,
    aiResponsibilityAnalyzedAt: dbData.ai_responsibility_analyzed_at || null,
  };
};

export const useEditRequest = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  const { refreshRequests } = useMaintenanceRequestContext();

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
      
      console.log('useEditRequest - Update successful, updated fields:', Object.keys(dbUpdateData));
      console.log('useEditRequest - New title value:', data?.title);
      
      // Auto-transition status to in-progress if admin/manager edits pending/open request
      const { data: { user } } = await supabase.auth.getUser();
      if (user && data?.status) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
          
        if (profile && (profile.role === 'admin' || profile.role === 'manager')) {
          if (data.status === 'pending' || data.status === 'open') {
            console.log('useEditRequest - Auto-transitioning to in-progress');
            const { autoTransitionToInProgress } = await import('@/utils/statusTransitions');
            await autoTransitionToInProgress(requestId, data.status, profile.role);
          }
        }
      }
      
      // v85.0 SIMPLE FIX: Just refresh all requests from the API
      console.log('useEditRequest - Calling refreshRequests to update UI');
      await refreshRequests();
      
      toast.success('Request updated successfully');
      
      // Transform the database response to match MaintenanceRequest type
      return transformDbToMaintenanceRequest(data);
      
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
