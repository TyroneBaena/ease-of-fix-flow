
import { MaintenanceRequest } from '@/types/maintenance';

export interface MaintenanceRequestContextType {
  requests: MaintenanceRequest[];
  loading: boolean;
  getRequestsForProperty: (propertyId: string) => MaintenanceRequest[];
  addRequestToProperty: (request: Omit<MaintenanceRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => Promise<MaintenanceRequest | undefined>;
  fetchRequests: () => Promise<MaintenanceRequest[]>;
}

export interface ProcessedAttachment {
  url: string;
}

export interface ProcessedHistory {
  action: string;
  timestamp: string;
}
