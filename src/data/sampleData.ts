
export const requests = [
  {
    id: '1001',
    title: 'Broken Air Conditioning Unit',
    description: 'The air conditioning unit in the main conference room is not functioning. Room temperature is uncomfortably warm which is affecting meetings.',
    status: 'open',
    priority: 'high',
    category: 'HVAC',
    location: 'Conference Room A, 2nd Floor',
    createdAt: '2 days ago',
    dueDate: 'Tomorrow',
    assignedTo: 'John Smith',
    attachments: [
      { url: '/placeholder.svg' },
      { url: '/placeholder.svg' }
    ],
    history: [
      { action: 'Request created', timestamp: '2 days ago' },
      { action: 'Assigned to John Smith', timestamp: '1 day ago' }
    ]
  },
  {
    id: '1002',
    title: 'Leaking Faucet in Restroom',
    description: 'The sink faucet in the women\'s restroom on the 1st floor is constantly dripping. This is causing water wastage and an annoying sound.',
    status: 'in-progress',
    priority: 'medium',
    category: 'Plumbing',
    location: 'Women\'s Restroom, 1st Floor',
    createdAt: '5 days ago',
    dueDate: 'Today',
    assignedTo: 'Mike Johnson',
    history: [
      { action: 'Request created', timestamp: '5 days ago' },
      { action: 'Assigned to Mike Johnson', timestamp: '4 days ago' },
      { action: 'Status changed to In Progress', timestamp: '2 days ago' }
    ]
  },
  {
    id: '1003',
    title: 'Light Bulb Replacement',
    description: 'Multiple light bulbs have burnt out in the open office area near the marketing department. The area is now too dim for comfortable working.',
    status: 'completed',
    priority: 'low',
    category: 'Electrical',
    location: 'Open Office, 3rd Floor',
    createdAt: '1 week ago',
    assignedTo: 'Sarah Wilson',
    history: [
      { action: 'Request created', timestamp: '1 week ago' },
      { action: 'Assigned to Sarah Wilson', timestamp: '6 days ago' },
      { action: 'Status changed to In Progress', timestamp: '5 days ago' },
      { action: 'Completed maintenance', timestamp: '3 days ago' }
    ]
  },
  {
    id: '1004',
    title: 'Door Won\'t Lock Properly',
    description: 'The lock on the supply closet door is not working properly. Sometimes the door remains unlocked even when the key is turned.',
    status: 'open',
    priority: 'medium',
    category: 'Structural',
    location: 'Supply Closet, Basement Level',
    createdAt: '3 days ago',
    history: [
      { action: 'Request created', timestamp: '3 days ago' }
    ]
  },
  {
    id: '1005',
    title: 'Elevator Making Strange Noise',
    description: 'The main elevator has been making a grinding noise when moving between floors. It still functions but the noise is concerning.',
    status: 'in-progress',
    priority: 'critical',
    category: 'Elevator',
    location: 'Main Elevator, Building A',
    createdAt: '1 day ago',
    dueDate: 'Today',
    assignedTo: 'Technical Team',
    history: [
      { action: 'Request created', timestamp: '1 day ago' },
      { action: 'Assigned to Technical Team', timestamp: '1 day ago' },
      { action: 'Status changed to In Progress', timestamp: '12 hours ago' }
    ]
  },
  {
    id: '1006',
    title: 'Carpet Stain in Meeting Room',
    description: 'There is a large coffee stain on the carpet in Meeting Room B. Needs professional cleaning as regular cleaning methods haven\'t worked.',
    status: 'open',
    priority: 'low',
    category: 'Cleaning',
    location: 'Meeting Room B, 4th Floor',
    createdAt: '4 days ago',
    history: [
      { action: 'Request created', timestamp: '4 days ago' }
    ]
  },
  {
    id: '1007',
    title: 'Coffee Machine Repair',
    description: 'The coffee machine in the main break room is dispensing coffee that tastes burnt and is making unusual noises during operation.',
    status: 'completed',
    priority: 'medium',
    category: 'Appliance',
    location: 'Break Room, 2nd Floor',
    createdAt: '1 week ago',
    assignedTo: 'Maintenance Staff',
    history: [
      { action: 'Request created', timestamp: '1 week ago' },
      { action: 'Assigned to Maintenance Staff', timestamp: '6 days ago' },
      { action: 'Status changed to In Progress', timestamp: '5 days ago' },
      { action: 'Completed maintenance', timestamp: '2 days ago' }
    ]
  },
  {
    id: '1008',
    title: 'Window Doesn\'t Close Properly',
    description: 'One of the windows in the east wing office doesn\'t close completely, causing a draft and noise from outside.',
    status: 'in-progress',
    priority: 'medium',
    category: 'Structural',
    location: 'Office 412, 4th Floor',
    createdAt: '6 days ago',
    dueDate: 'Next week',
    assignedTo: 'John Smith',
    history: [
      { action: 'Request created', timestamp: '6 days ago' },
      { action: 'Assigned to John Smith', timestamp: '5 days ago' },
      { action: 'Status changed to In Progress', timestamp: '3 days ago' }
    ]
  }
];
