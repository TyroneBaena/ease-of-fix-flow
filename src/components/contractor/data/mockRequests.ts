import { MaintenanceRequest } from '@/types/maintenance';

export const mockRequests: MaintenanceRequest[] = [
  {
    id: 'REQ-2023-001',
    title: 'Broken Air Conditioning Unit',
    status: 'pending',
    quote: '-',
    date: new Date('2023-04-10').toISOString(),
    description: 'The air conditioning unit in the main conference room is not functioning properly.',
    location: 'Conference Room A, 2nd Floor',
    priority: 'high',
    site: 'Dental Practice LLC',
    submittedBy: 'Jane Smith',
    contactNumber: '555-123-4567',
    address: '123 Main Street, Suite 100',
    practiceLeader: 'Dr. John Brown',
    practiceLeaderPhone: '555-987-6543',
    attachments: [
      { url: '/placeholder.svg' },
      { url: '/placeholder.svg' }
    ]
  },
  {
    id: 'REQ-2023-002',
    title: 'Leaking Faucet',
    status: 'in-progress',
    quote: '$350',
    date: new Date('2023-04-05').toISOString(),
    description: 'The sink faucet in the staff break room is constantly leaking.',
    location: 'Break Room, 1st Floor',
    priority: 'medium'
  },
  {
    id: 'REQ-2023-003',
    title: 'Light Fixtures Replacement',
    status: 'completed',
    quote: '$750',
    date: new Date('2023-03-28').toISOString(),
    description: 'Three light fixtures in the reception area need to be replaced.',
    location: 'Reception, Main Entrance',
    priority: 'low'
  },
  {
    id: 'REQ-2023-004',
    title: 'Parking Lot Pothole Repair',
    status: 'pending',
    quote: '-',
    date: new Date('2023-04-12').toISOString(),
    description: 'Large pothole in the staff parking area needs to be filled.',
    location: 'Staff Parking Lot, Section B',
    priority: 'medium'
  },
  {
    id: 'REQ-2023-005',
    title: 'Waiting Room Chair Repair',
    status: 'in-progress',
    quote: '$200',
    date: new Date('2023-04-08').toISOString(),
    description: 'Two chairs in the waiting room have damaged armrests.',
    location: 'Patient Waiting Area',
    priority: 'low'
  },
  {
    id: 'REQ-2023-006',
    title: 'Roof Leak Inspection',
    status: 'completed',
    quote: '$1,200',
    date: new Date('2023-03-15').toISOString(),
    description: 'Water stains on ceiling indicating possible roof leak.',
    location: 'X-ray Room, 2nd Floor',
    priority: 'high'
  }
];
