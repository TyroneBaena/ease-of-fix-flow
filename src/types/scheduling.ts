
export interface ScheduledDate {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
}

export interface JobSchedule {
  id: string;
  requestId: string;
  contractorId: string;
  scheduledDates: ScheduledDate[];
  createdAt: string;
  updatedAt: string;
}

export interface SchedulingFormData {
  date: string;
  startTime: string;
  endTime: string;
  notes?: string;
}
