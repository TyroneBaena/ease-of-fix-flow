
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { MaintenanceRequest, isAttachmentArray, isHistoryArray } from '../types/property';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { useUserContext } from './UserContext';

interface MaintenanceRequestContextType {
  requests: MaintenanceRequest[];
  loading: boolean;
  getRequestsForProperty: (propertyId: string) => MaintenanceRequest[];
  addRequestToProperty: (request: Omit<MaintenanceRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => Promise<MaintenanceRequest | undefined>;
}

const MaintenanceRequestContext = createContext<MaintenanceRequestContextType | undefined>(undefined);

export const useMaintenanceRequestContext = () => {
  const context = useContext(MaintenanceRequestContext);
  if (!context) {
    throw new Error('useMaintenanceRequestContext must be used within a MaintenanceRequestProvider');
  }
  return context;
};

export const MaintenanceRequestProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { currentUser } = useUserContext();

  useEffect(() => {
    if (currentUser) {
      fetchRequests();
    } else {
      setRequests([]);
      setLoading(false);
    }
  }, [currentUser]);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select('*');

      if (error) {
        console.error('Error fetching maintenance requests:', error);
        toast.error('Failed to fetch maintenance requests');
        return;
      }

      const formattedRequests: MaintenanceRequest[] = data.map(req => {
        let processedAttachments;
        if (req.attachments) {
          if (isAttachmentArray(req.attachments)) {
            processedAttachments = req.attachments;
          } else if (Array.isArray(req.attachments)) {
            processedAttachments = req.attachments.map(item => {
              if (typeof item === 'object' && item !== null && 'url' in item) {
                return { url: item.url };
              }
              return { url: String(item) };
            });
          } else {
            processedAttachments = null;
          }
        } else {
          processedAttachments = null;
        }

        let processedHistory;
        if (req.history) {
          if (isHistoryArray(req.history)) {
            processedHistory = req.history;
          } else if (Array.isArray(req.history)) {
            processedHistory = req.history.map(item => {
              if (typeof item === 'object' && item !== null && 'action' in item && 'timestamp' in item) {
                return { action: item.action, timestamp: item.timestamp };
              }
              return { action: String(item), timestamp: new Date().toISOString() };
            });
          } else {
            processedHistory = null;
          }
        } else {
          processedHistory = null;
        }

        return {
          id: req.id,
          isParticipantRelated: req.is_participant_related || false,
          participantName: req.participant_name || 'N/A',
          attemptedFix: req.attempted_fix || '',
          issueNature: req.issue_nature || req.title || '',
          explanation: req.explanation || req.description || '',
          location: req.location || '',
          reportDate: req.report_date || req.created_at.split('T')[0] || '',
          site: req.site || req.category || '',
          submittedBy: req.submitted_by || '',
          status: req.status || 'open',
          title: req.title,
          description: req.description,
          category: req.category,
          priority: req.priority,
          propertyId: req.property_id,
          createdAt: req.created_at,
          updatedAt: req.updated_at,
          dueDate: req.due_date || undefined,
          assignedTo: req.assigned_to || undefined,
          attachments: processedAttachments,
          history: processedHistory
        };
      });

      setRequests(formattedRequests);
    } catch (err) {
      console.error('Unexpected error fetching requests:', err);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getRequestsForProperty = (propertyId: string) => {
    return requests.filter(request => request.propertyId === propertyId);
  };

  const addRequestToProperty = async (requestData: Omit<MaintenanceRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (!currentUser) {
        toast.error('You must be logged in to add a request');
        return;
      }

      const requestToInsert = {
        title: requestData.issueNature,
        description: requestData.explanation,
        category: requestData.site,
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
      };

      const { data, error } = await supabase
        .from('maintenance_requests')
        .insert(requestToInsert)
        .select('*')
        .single();

      if (error) {
        console.error('Error adding maintenance request:', error);
        toast.error('Failed to add maintenance request');
        return;
      }

      let processedAttachments = null;
      if (data.attachments) {
        if (isAttachmentArray(data.attachments)) {
          processedAttachments = data.attachments;
        } else {
          processedAttachments = null;
        }
      }

      let processedHistory = null;
      if (data.history) {
        if (isHistoryArray(data.history)) {
          processedHistory = data.history;
        } else {
          processedHistory = null;
        }
      }

      const newRequest: MaintenanceRequest = {
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

      setRequests(prev => [...prev, newRequest]);
      toast.success('Maintenance request added successfully');
      return newRequest;
    } catch (err) {
      console.error('Unexpected error adding maintenance request:', err);
      toast.error('An unexpected error occurred');
    }
  };

  return (
    <MaintenanceRequestContext.Provider value={{
      requests,
      loading,
      getRequestsForProperty,
      addRequestToProperty
    }}>
      {children}
    </MaintenanceRequestContext.Provider>
  );
};
