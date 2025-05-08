
import { useState, useEffect } from 'react';
import { MaintenanceRequest } from '@/types/maintenance';
import { supabase } from '@/lib/supabase';
import { useUserContext } from '@/contexts/UserContext';
import { toast } from '@/lib/toast';

export const useContractorDashboard = () => {
  const { currentUser } = useUserContext();
  const [contractorId, setContractorId] = useState<string | null>(null);
  const [pendingQuoteRequests, setPendingQuoteRequests] = useState<MaintenanceRequest[]>([]);
  const [activeJobs, setActiveJobs] = useState<MaintenanceRequest[]>([]);
  const [completedJobs, setCompletedJobs] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Find the contractor ID for the current user
  useEffect(() => {
    if (!currentUser) return;

    const fetchContractorId = async () => {
      try {
        const { data, error } = await supabase
          .from('contractors')
          .select('id')
          .eq('user_id', currentUser.id)
          .single();

        if (error) throw error;
        if (data) {
          setContractorId(data.id);
          console.log('Found contractor ID:', data.id);
        }
      } catch (err) {
        console.error('Error fetching contractor ID:', err);
        setError('Could not verify contractor status');
        toast.error('Error loading contractor information');
      }
    };

    fetchContractorId();
  }, [currentUser]);

  // Fetch all relevant data once we have the contractor ID
  useEffect(() => {
    if (!contractorId) return;
    
    const fetchContractorData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch quote requests
        const { data: quotes, error: quotesError } = await supabase
          .from('quotes')
          .select('*, maintenance_requests(*)')
          .eq('contractor_id', contractorId)
          .eq('status', 'requested');
          
        if (quotesError) throw quotesError;
        
        // Fetch active jobs where this contractor is assigned
        const { data: activeJobsData, error: activeJobsError } = await supabase
          .from('maintenance_requests')
          .select('*')
          .eq('contractor_id', contractorId)
          .eq('status', 'in-progress');
          
        if (activeJobsError) throw activeJobsError;
        
        // Fetch completed jobs
        const { data: completedJobsData, error: completedJobsError } = await supabase
          .from('maintenance_requests')
          .select('*')
          .eq('contractor_id', contractorId)
          .eq('status', 'completed');
          
        if (completedJobsError) throw completedJobsError;
        
        // Map the requests from the quotes to MaintenanceRequest type
        const pendingRequests = quotes.map((quote: any) => mapRequestFromQuote(quote));
        const activeRequests = activeJobsData.map(mapRequestFromDb);
        const completedRequests = completedJobsData.map(mapRequestFromDb);
        
        setPendingQuoteRequests(pendingRequests);
        setActiveJobs(activeRequests);
        setCompletedJobs(completedRequests);
        
        console.log(`Loaded ${pendingRequests.length} pending quotes, ${activeRequests.length} active jobs, ${completedRequests.length} completed jobs`);
      } catch (error) {
        console.error('Error fetching contractor data:', error);
        setError('Failed to load contractor dashboard data');
        toast.error('Could not load job data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchContractorData();
    
    // Set up real-time subscription for any updates
    const channel = supabase
      .channel('contractor-data-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public',
        table: 'maintenance_requests',
        filter: `contractor_id=eq.${contractorId}`
      }, () => {
        console.log('Maintenance request updated, refreshing data');
        fetchContractorData();
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public',
        table: 'quotes',
        filter: `contractor_id=eq.${contractorId}`
      }, () => {
        console.log('Quote updated, refreshing data');
        fetchContractorData();
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [contractorId]);

  // Helper function to map database objects to MaintenanceRequest type
  const mapRequestFromDb = (job: any): MaintenanceRequest => ({
    id: job.id,
    title: job.title || job.issue_nature || 'Untitled request',
    description: job.description || job.explanation || '',
    status: job.status || 'pending',
    location: job.location || '',
    priority: job.priority || 'medium',
    site: job.site || job.category || '',
    submittedBy: job.submitted_by || 'Unknown',
    date: job.created_at,
    propertyId: job.property_id,
    contactNumber: job.contact_number,
    address: job.address,
    practiceLeader: job.practice_leader,
    practiceLeaderPhone: job.practice_leader_phone,
    attachments: job.attachments,
    category: job.category,
    createdAt: job.created_at,
    updatedAt: job.updated_at,
    dueDate: job.due_date,
    assignedTo: job.assigned_to,
    history: job.history,
    isParticipantRelated: job.is_participant_related || false,
    participantName: job.participant_name || 'N/A',
    attemptedFix: job.attempted_fix || '',
    issueNature: job.issue_nature || '',
    explanation: job.explanation || '',
    reportDate: job.report_date || '',
    contractorId: job.contractor_id,
    assignedAt: job.assigned_at,
    completionPercentage: job.completion_percentage || 0,
    completionPhotos: job.completion_photos,
    progressNotes: job.progress_notes || [],
    quoteRequested: job.quote_requested || false,
    quotedAmount: job.quoted_amount
  });

  // Helper function to map quote objects to MaintenanceRequest type
  const mapRequestFromQuote = (quote: any): MaintenanceRequest => {
    const request = quote.maintenance_requests;
    return {
      id: request.id,
      title: request.title || request.issue_nature || 'Untitled request',
      description: request.description || request.explanation || '',
      status: request.status,
      location: request.location,
      priority: request.priority || 'medium',
      site: request.site || request.category || '',
      submittedBy: request.submitted_by || 'Unknown',
      quote: {
        id: quote.id,
        amount: quote.amount,
        status: quote.status,
        description: quote.description,
        submittedAt: quote.submitted_at
      },
      date: request.created_at,
      propertyId: request.property_id,
      contactNumber: request.contact_number,
      address: request.address,
      practiceLeader: request.practice_leader,
      practiceLeaderPhone: request.practice_leader_phone,
      attachments: request.attachments,
      category: request.category,
      createdAt: request.created_at,
      updatedAt: request.updated_at,
      dueDate: request.due_date,
      assignedTo: request.assigned_to,
      history: request.history,
      isParticipantRelated: request.is_participant_related || false,
      participantName: request.participant_name || 'N/A',
      attemptedFix: request.attempted_fix || '',
      issueNature: request.issue_nature || '',
      explanation: request.explanation || '',
      reportDate: request.report_date || '',
      contractorId: request.contractor_id,
      assignedAt: request.assigned_at,
      completionPercentage: request.completion_percentage || 0,
      completionPhotos: request.completion_photos,
      progressNotes: request.progress_notes || [],
      quoteRequested: request.quote_requested || false,
      quotedAmount: request.quoted_amount
    };
  };

  const refreshData = () => {
    if (contractorId) {
      setLoading(true);
      toast.info('Refreshing data...');
    }
  };

  return {
    pendingQuoteRequests,
    activeJobs,
    completedJobs,
    loading,
    error,
    contractorId,
    refreshData
  };
};
