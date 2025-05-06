import { useState, useEffect } from 'react';
import { useMaintenanceRequestContext } from '@/contexts/maintenance';
import { useUserContext } from '@/contexts/UserContext';
import { supabase } from '@/lib/supabase';
import { Quote } from '@/types/contractor';
import { MaintenanceRequest } from '@/types/maintenance';
import { toast } from 'sonner';

export const useRequestDetailData = (requestId: string | undefined, forceRefresh: number = 0) => {
  const { requests, fetchRequests } = useMaintenanceRequestContext();
  const { currentUser } = useUserContext();
  const [request, setRequest] = useState<MaintenanceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isContractor, setIsContractor] = useState(false);
  
  // Effect for handling request data
  useEffect(() => {
    if (!requestId) return;
    
    const loadRequestData = async () => {
      setLoading(true);
      
      // Refresh the requests data if needed
      if (forceRefresh > 0) {
        console.log("useRequestDetailData - Force refreshing request data");
        await fetchRequests();
      }
      
      // Try to get the latest request data directly from the database
      try {
        const { data: freshRequestData, error: freshRequestError } = await supabase
          .from('maintenance_requests')
          .select('*')
          .eq('id', requestId)
          .single();
          
        if (!freshRequestError && freshRequestData) {
          console.log("useRequestDetailData - Fetched fresh request data:", freshRequestData);
          // Convert snake_case to camelCase where needed
          const formattedRequest: MaintenanceRequest = {
            id: freshRequestData.id,
            title: freshRequestData.title || freshRequestData.issue_nature || 'Untitled Request',
            description: freshRequestData.description || '',
            // Use type assertion to ensure status is one of the allowed values
            status: freshRequestData.status as 'pending' | 'in-progress' | 'completed' | 'open',
            location: freshRequestData.location,
            priority: freshRequestData.priority as 'low' | 'medium' | 'high' | undefined,
            site: freshRequestData.site || freshRequestData.category || 'Unknown',
            submittedBy: freshRequestData.submitted_by || 'Anonymous',
            propertyId: freshRequestData.property_id,
            // These fields may not exist in the database response, so use empty string as default
            contactNumber: '',  // Default fallback value since it's missing from DB
            address: '',        // Default fallback value since it's missing from DB
            // Handle JSON fields with proper type casting
            attachments: freshRequestData.attachments ? 
              (Array.isArray(freshRequestData.attachments) ? 
                freshRequestData.attachments as { url: string }[] : 
                []) : 
              null,
            category: freshRequestData.category,
            createdAt: freshRequestData.created_at,
            updatedAt: freshRequestData.updated_at,
            dueDate: freshRequestData.due_date,
            assignedTo: freshRequestData.assigned_to,
            // Handle JSON fields with proper type casting
            history: freshRequestData.history ? 
              (Array.isArray(freshRequestData.history) ? 
                freshRequestData.history as { action: string; timestamp: string }[] : 
                []) : 
              null,
            isParticipantRelated: freshRequestData.is_participant_related || false,
            participantName: freshRequestData.participant_name || 'N/A',
            attemptedFix: freshRequestData.attempted_fix || '',
            issueNature: freshRequestData.issue_nature || '',
            explanation: freshRequestData.explanation || '',
            reportDate: freshRequestData.report_date || '',
            contractorId: freshRequestData.contractor_id,
            assignedAt: freshRequestData.assigned_at,
            completionPercentage: freshRequestData.completion_percentage,
            // Handle JSON fields with proper type casting
            completionPhotos: freshRequestData.completion_photos ? 
              (Array.isArray(freshRequestData.completion_photos) ? 
                freshRequestData.completion_photos as { url: string }[] : 
                []) : 
              null,
            quoteRequested: freshRequestData.quote_requested,
            quotedAmount: freshRequestData.quoted_amount,
            progressNotes: freshRequestData.progress_notes
          };
          
          setRequest(formattedRequest);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.log("useRequestDetailData - Error fetching fresh data, falling back to context:", err);
      }
      
      // Fall back to data from the context if direct fetch fails
      const foundRequest = requests.find(req => req.id === requestId);
      if (foundRequest) {
        console.log("useRequestDetailData - Found request in context:", foundRequest);
        console.log("useRequestDetailData - contractorId:", foundRequest.contractorId);
        console.log("useRequestDetailData - status:", foundRequest.status);
        console.log("useRequestDetailData - assignedTo:", foundRequest.assignedTo);
        setRequest(foundRequest);
      } else {
        console.log("useRequestDetailData - Request not found for ID:", requestId);
        toast.error("Request not found");
      }
      
      setLoading(false);
    };
    
    loadRequestData();
  }, [requestId, requests, forceRefresh, fetchRequests]);
  
  // Effect for quotes and contractor status - keep these separate
  useEffect(() => {
    if (!requestId || !currentUser?.id) return;
    
    const fetchQuotes = async () => {
      try {
        const { data, error } = await supabase
          .from('quotes')
          .select('*')
          .eq('request_id', requestId)
          .order('created_at', { ascending: false });
          
        if (!error && data) {
          // Map database fields to our interface fields
          const mappedQuotes: Quote[] = data.map(quote => ({
            id: quote.id,
            requestId: quote.request_id,
            contractorId: quote.contractor_id,
            amount: quote.amount,
            description: quote.description || undefined,
            status: quote.status as 'requested' | 'pending' | 'approved' | 'rejected',
            submittedAt: quote.submitted_at,
            approvedAt: quote.approved_at || undefined,
            createdAt: quote.created_at,
            updatedAt: quote.updated_at
          }));
          
          console.log("useRequestDetailData - Fetched quotes:", mappedQuotes);
          setQuotes(mappedQuotes);
        } else if (error) {
          console.error("useRequestDetailData - Error fetching quotes:", error);
          toast.error("Failed to load quotes");
        }
      } catch (err) {
        console.error("useRequestDetailData - Exception fetching quotes:", err);
        toast.error("Error loading quotes data");
      }
    };
    
    // Check if current user is a contractor
    const checkContractorStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('contractors')
          .select('id')
          .eq('user_id', currentUser.id)
          .single();
          
        if (!error && data) {
          console.log("useRequestDetailData - User is a contractor:", data);
          setIsContractor(true);
        } else {
          console.log("useRequestDetailData - User is not a contractor:", error);
          setIsContractor(false);
        }
      } catch (err) {
        console.error("useRequestDetailData - Exception checking contractor status:", err);
        toast.error("Error checking user role");
        setIsContractor(false);
      }
    };
    
    fetchQuotes();
    checkContractorStatus();
  }, [requestId, currentUser?.id, forceRefresh]);

  const refreshData = async () => {
    console.log("useRequestDetailData - Manual refresh requested");
    await fetchRequests();
    
    if (requestId) {
      // Directly fetch the latest request data
      try {
        const { data, error } = await supabase
          .from('maintenance_requests')
          .select('*')
          .eq('id', requestId)
          .single();
          
        if (!error && data) {
          console.log("useRequestDetailData - Refresh fetched fresh data:", data);
          // Update the request with the fresh data
          // We need to convert snake_case to camelCase
          const formattedRequest: MaintenanceRequest = {
            id: data.id,
            title: data.title || data.issue_nature || 'Untitled Request',
            description: data.description || '',
            // Use type assertion for status
            status: data.status as 'pending' | 'in-progress' | 'completed' | 'open',
            location: data.location,
            priority: data.priority as 'low' | 'medium' | 'high' | undefined,
            site: data.site || data.category || 'Unknown',
            submittedBy: data.submitted_by || 'Anonymous',
            propertyId: data.property_id,
            // These fields may not exist in the database response, so use empty string as default
            contactNumber: '',  // Default fallback value since it's missing from DB
            address: '',        // Default fallback value since it's missing from DB
            // Handle JSON fields with proper type casting
            attachments: data.attachments ? 
              (Array.isArray(data.attachments) ? 
                data.attachments as { url: string }[] : 
                []) : 
              null,
            category: data.category,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            dueDate: data.due_date,
            assignedTo: data.assigned_to,
            // Handle JSON fields with proper type casting
            history: data.history ? 
              (Array.isArray(data.history) ? 
                data.history as { action: string; timestamp: string }[] : 
                []) : 
              null,
            isParticipantRelated: data.is_participant_related || false,
            participantName: data.participant_name || 'N/A',
            attemptedFix: data.attempted_fix || '',
            issueNature: data.issue_nature || '',
            explanation: data.explanation || '',
            reportDate: data.report_date || '',
            contractorId: data.contractor_id,
            assignedAt: data.assigned_at,
            completionPercentage: data.completion_percentage,
            // Handle JSON fields with proper type casting
            completionPhotos: data.completion_photos ? 
              (Array.isArray(data.completion_photos) ? 
                data.completion_photos as { url: string }[] : 
                []) : 
              null,
            quoteRequested: data.quote_requested,
            quotedAmount: data.quoted_amount,
            progressNotes: data.progress_notes
          };
          
          setRequest(formattedRequest);
        }
      } catch (err) {
        console.error("useRequestDetailData - Error directly fetching request:", err);
      }
    }
  };

  return {
    request,
    loading,
    quotes,
    isContractor,
    refreshData
  };
};
