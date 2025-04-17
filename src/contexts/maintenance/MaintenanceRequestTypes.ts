
import { MaintenanceRequest } from '@/types/property';

export interface MaintenanceRequestContextType {
  requests: MaintenanceRequest[];
  loading: boolean;
  getRequestsForProperty: (propertyId: string) => MaintenanceRequest[];
  addRequestToProperty: (request: Omit<MaintenanceRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => Promise<MaintenanceRequest | undefined>;
}

export interface ProcessedAttachment {
  url: string;
}

export interface ProcessedHistory {
  action: string;
  timestamp: string;
}
