
import { MaintenanceRequest } from '@/types/property';

// Mock maintenance requests data
export const mockMaintenanceRequests: MaintenanceRequest[] = [
  {
    id: '1',
    title: 'Broken AC in Meeting Room',
    description: 'The air conditioning unit is not working properly',
    category: 'HVAC',
    location: 'Meeting Room',
    priority: 'high',
    status: 'open',
    propertyId: '1',
    createdAt: '2023-04-05T10:30:00Z',
    updatedAt: '2023-04-05T10:30:00Z'
  },
  {
    id: '2',
    title: 'Leaking Faucet in Kitchen',
    description: 'The kitchen sink faucet has been leaking continuously',
    category: 'Plumbing',
    location: 'Kitchen',
    priority: 'medium',
    status: 'in-progress',
    propertyId: '2',
    createdAt: '2023-04-07T14:20:00Z',
    updatedAt: '2023-04-08T09:15:00Z'
  },
  {
    id: '3',
    title: 'Light Bulb Replacement in Office',
    description: 'Several light bulbs need to be replaced in the main office area',
    category: 'Electrical',
    location: 'Main Office',
    priority: 'low',
    status: 'open',
    propertyId: '1',
    createdAt: '2023-04-10T11:45:00Z',
    updatedAt: '2023-04-10T11:45:00Z'
  },
  {
    id: '4',
    title: 'Door Handle Broken',
    description: 'The conference room door handle is broken and needs repair',
    category: 'Structural',
    location: 'Conference Room',
    priority: 'medium',
    status: 'completed',
    propertyId: '3',
    createdAt: '2023-04-02T09:30:00Z',
    updatedAt: '2023-04-04T16:20:00Z'
  },
  {
    id: '5',
    title: 'Internet Connection Issues',
    description: 'Intermittent internet connectivity in the east wing',
    category: 'IT',
    location: 'East Wing',
    priority: 'high',
    status: 'in-progress',
    propertyId: '2',
    createdAt: '2023-04-09T13:15:00Z',
    updatedAt: '2023-04-10T10:30:00Z'
  }
];
