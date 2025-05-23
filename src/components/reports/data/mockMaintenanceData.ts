
import { MaintenanceRequest } from '@/types/maintenance';

// Mock maintenance requests data with both old and new fields
export const mockMaintenanceRequests: MaintenanceRequest[] = [
  {
    id: '1',
    isParticipantRelated: false,
    participantName: 'N/A',
    attemptedFix: 'Tried resetting the AC unit',
    issueNature: 'Broken AC in Meeting Room',
    explanation: 'The air conditioning unit is not working properly',
    location: 'Meeting Room',
    reportDate: '2023-04-05',
    site: 'Main Office',
    submittedBy: 'John Doe',
    status: 'open',
    createdAt: '2023-04-05T10:30:00Z',
    updatedAt: '2023-04-05T10:30:00Z',
    // Legacy fields
    title: 'Broken AC in Meeting Room',
    description: 'The air conditioning unit is not working properly',
    category: 'HVAC',
    priority: 'high',
    propertyId: '1',
    userId: 'mock-user-id-1',
  },
  {
    id: '2',
    isParticipantRelated: true,
    participantName: 'Sarah L.',
    attemptedFix: 'Tried tightening the faucet handle',
    issueNature: 'Leaking Faucet in Kitchen',
    explanation: 'The kitchen sink faucet has been leaking continuously',
    location: 'Kitchen',
    reportDate: '2023-04-07',
    site: 'Residential Unit 3',
    submittedBy: 'Mark Johnson',
    status: 'in-progress',
    createdAt: '2023-04-07T14:20:00Z',
    updatedAt: '2023-04-08T09:15:00Z',
    // Legacy fields
    title: 'Leaking Faucet in Kitchen',
    description: 'The kitchen sink faucet has been leaking continuously',
    category: 'Plumbing',
    priority: 'medium',
    propertyId: '2',
    userId: 'mock-user-id-2',
  },
  {
    id: '3',
    isParticipantRelated: false,
    participantName: 'N/A',
    attemptedFix: 'Checked the light fixtures',
    issueNature: 'Light Bulb Replacement',
    explanation: 'Several light bulbs need to be replaced in the main office area',
    location: 'Main Office',
    reportDate: '2023-04-10',
    site: 'Corporate HQ',
    submittedBy: 'Lisa Brown',
    status: 'open',
    createdAt: '2023-04-10T11:45:00Z',
    updatedAt: '2023-04-10T11:45:00Z',
    // Legacy fields
    title: 'Light Bulb Replacement in Office',
    description: 'Several light bulbs need to be replaced in the main office area',
    category: 'Electrical',
    priority: 'low',
    propertyId: '1',
    userId: 'mock-user-id-3',
  },
  {
    id: '4',
    isParticipantRelated: true,
    participantName: 'Robert K.',
    attemptedFix: 'Tried to tighten the handle screws',
    issueNature: 'Door Handle Broken',
    explanation: 'The conference room door handle is broken and needs repair',
    location: 'Conference Room',
    reportDate: '2023-04-02',
    site: 'Branch Office',
    submittedBy: 'Michael Wilson',
    status: 'completed',
    createdAt: '2023-04-02T09:30:00Z',
    updatedAt: '2023-04-04T16:20:00Z',
    // Legacy fields
    title: 'Door Handle Broken',
    description: 'The conference room door handle is broken and needs repair',
    category: 'Structural',
    priority: 'medium',
    propertyId: '3',
    userId: 'mock-user-id-1',
  },
  {
    id: '5',
    isParticipantRelated: false,
    participantName: 'N/A',
    attemptedFix: 'Rebooted the router and modem',
    issueNature: 'Internet Connection Issues',
    explanation: 'Intermittent internet connectivity in the east wing',
    location: 'East Wing',
    reportDate: '2023-04-09',
    site: 'Main Campus',
    submittedBy: 'Jennifer Smith',
    status: 'in-progress',
    createdAt: '2023-04-09T13:15:00Z',
    updatedAt: '2023-04-10T10:30:00Z',
    // Legacy fields
    title: 'Internet Connection Issues',
    description: 'Intermittent internet connectivity in the east wing',
    category: 'IT',
    priority: 'high',
    propertyId: '2',
    userId: 'mock-user-id-2',
  }
];
