
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Property, MaintenanceRequest, isAttachmentArray, isHistoryArray } from '../types/property';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { useUserContext } from './UserContext';

interface PropertyContextType {
  properties: Property[];
  loading: boolean;
  addProperty: (property: Omit<Property, 'id' | 'createdAt'>) => Promise<Property | undefined>;
  getProperty: (id: string) => Property | undefined;
  updateProperty: (id: string, property: Partial<Property>) => Promise<void>;
  deleteProperty: (id: string) => Promise<void>;
  getRequestsForProperty: (propertyId: string) => MaintenanceRequest[];
  addRequestToProperty: (request: Omit<MaintenanceRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => Promise<MaintenanceRequest | undefined>;
  requests: MaintenanceRequest[];
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

export const usePropertyContext = () => {
  const context = useContext(PropertyContext);
  if (!context) {
    throw new Error('usePropertyContext must be used within a PropertyProvider');
  }
  return context;
};

export const PropertyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { currentUser } = useUserContext();

  useEffect(() => {
    if (currentUser) {
      fetchProperties();
      fetchRequests();
    } else {
      setProperties([]);
      setRequests([]);
      setLoading(false);
    }
  }, [currentUser]);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('properties')
        .select('*');

      if (error) {
        console.error('Error fetching properties:', error);
        toast.error('Failed to fetch properties');
        return;
      }

      const formattedProperties: Property[] = data.map(prop => ({
        id: prop.id,
        name: prop.name,
        address: prop.address,
        contactNumber: prop.contact_number,
        email: prop.email,
        practiceLeader: prop.practice_leader,
        practiceLeaderEmail: prop.practice_leader_email || '',
        practiceLeaderPhone: prop.practice_leader_phone || '',
        renewalDate: prop.renewal_date ? new Date(prop.renewal_date).toISOString() : '',
        rentAmount: Number(prop.rent_amount) || 0,
        createdAt: prop.created_at
      }));

      setProperties(formattedProperties);
    } catch (err) {
      console.error('Unexpected error fetching properties:', err);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

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
        // Type assertion to include any field access without TypeScript errors
        const reqAny = req as any;
        
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
          isParticipantRelated: reqAny.is_participant_related || false,
          participantName: reqAny.participant_name || 'N/A',
          attemptedFix: reqAny.attempted_fix || '',
          issueNature: reqAny.issue_nature || req.title || '',
          explanation: reqAny.explanation || req.description || '',
          location: req.location || '',
          reportDate: reqAny.report_date || req.created_at.split('T')[0] || '',
          site: reqAny.site || req.category || '',
          submittedBy: reqAny.submitted_by || '',
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
    }
  };

  const addProperty = async (property: Omit<Property, 'id' | 'createdAt'>) => {
    try {
      if (!currentUser) {
        toast.error('You must be logged in to add a property');
        return;
      }

      const propertyToInsert = {
        name: property.name,
        address: property.address,
        contact_number: property.contactNumber,
        email: property.email,
        practice_leader: property.practiceLeader,
        practice_leader_email: property.practiceLeaderEmail,
        practice_leader_phone: property.practiceLeaderPhone,
        renewal_date: property.renewalDate || null,
        rent_amount: property.rentAmount,
        user_id: currentUser.id
      };

      const { data, error } = await supabase
        .from('properties')
        .insert(propertyToInsert)
        .select('*')
        .single();

      if (error) {
        console.error('Error adding property:', error);
        toast.error('Failed to add property');
        return;
      }

      const newProperty: Property = {
        id: data.id,
        name: data.name,
        address: data.address,
        contactNumber: data.contact_number,
        email: data.email,
        practiceLeader: data.practice_leader,
        practiceLeaderEmail: data.practice_leader_email || '',
        practiceLeaderPhone: data.practice_leader_phone || '',
        renewalDate: data.renewal_date ? new Date(data.renewal_date).toISOString() : '',
        rentAmount: Number(data.rent_amount) || 0,
        createdAt: data.created_at
      };

      setProperties(prev => [...prev, newProperty]);
      toast.success('Property added successfully');
      return newProperty;
    } catch (err) {
      console.error('Unexpected error adding property:', err);
      toast.error('An unexpected error occurred');
    }
  };

  const getProperty = (id: string) => {
    return properties.find(property => property.id === id);
  };

  const updateProperty = async (id: string, propertyUpdate: Partial<Property>) => {
    try {
      if (!currentUser) {
        toast.error('You must be logged in to update a property');
        return;
      }

      const propertyToUpdate: any = {};
      if ('name' in propertyUpdate) propertyToUpdate.name = propertyUpdate.name;
      if ('address' in propertyUpdate) propertyToUpdate.address = propertyUpdate.address;
      if ('contactNumber' in propertyUpdate) propertyToUpdate.contact_number = propertyUpdate.contactNumber;
      if ('email' in propertyUpdate) propertyToUpdate.email = propertyUpdate.email;
      if ('practiceLeader' in propertyUpdate) propertyToUpdate.practice_leader = propertyUpdate.practiceLeader;
      if ('practiceLeaderEmail' in propertyUpdate) propertyToUpdate.practice_leader_email = propertyUpdate.practiceLeaderEmail;
      if ('practiceLeaderPhone' in propertyUpdate) propertyToUpdate.practice_leader_phone = propertyUpdate.practiceLeaderPhone;
      if ('renewalDate' in propertyUpdate) propertyToUpdate.renewal_date = propertyUpdate.renewalDate || null;
      if ('rentAmount' in propertyUpdate) propertyToUpdate.rent_amount = propertyUpdate.rentAmount;

      const { error } = await supabase
        .from('properties')
        .update(propertyToUpdate)
        .eq('id', id);

      if (error) {
        console.error('Error updating property:', error);
        toast.error('Failed to update property');
        return;
      }

      setProperties(properties.map(property => 
        property.id === id ? { ...property, ...propertyUpdate } : property
      ));
      
      toast.success('Property updated successfully');
    } catch (err) {
      console.error('Unexpected error updating property:', err);
      toast.error('An unexpected error occurred');
    }
  };

  const deleteProperty = async (id: string) => {
    try {
      if (!currentUser) {
        toast.error('You must be logged in to delete a property');
        return;
      }

      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting property:', error);
        toast.error('Failed to delete property');
        return;
      }

      setProperties(properties.filter(property => property.id !== id));
      setRequests(requests.filter(request => request.propertyId !== id));
      
      toast.success('Property deleted successfully');
    } catch (err) {
      console.error('Unexpected error deleting property:', err);
      toast.error('An unexpected error occurred');
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

      // Type assertion to access any field without TypeScript errors
      const dataAny = data as any;
      
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
        isParticipantRelated: dataAny.is_participant_related || false,
        participantName: dataAny.participant_name || 'N/A',
        attemptedFix: dataAny.attempted_fix || '',
        issueNature: dataAny.issue_nature || data.title || '',
        explanation: dataAny.explanation || data.description || '',
        location: data.location || '',
        reportDate: dataAny.report_date || data.created_at.split('T')[0],
        site: dataAny.site || data.category || '',
        submittedBy: dataAny.submitted_by || '',
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
    <PropertyContext.Provider value={{
      properties,
      loading,
      addProperty,
      getProperty,
      updateProperty,
      deleteProperty,
      getRequestsForProperty,
      addRequestToProperty,
      requests
    }}>
      {children}
    </PropertyContext.Provider>
  );
};
