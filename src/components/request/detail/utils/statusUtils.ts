
export const getStatusColor = (status: string) => {
  switch (status) {
    case 'open':
    case 'pending':
      return 'bg-amber-100 text-amber-800';
    case 'in-progress':
      return 'bg-blue-100 text-blue-800';
    case 'completed':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const getStatusDisplay = (status: string) => {
  switch (status) {
    case 'open':
      return 'Open';
    case 'pending':
      return 'Pending';
    case 'in-progress':
      return 'In Progress';
    case 'completed':
      return 'Completed';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
};
