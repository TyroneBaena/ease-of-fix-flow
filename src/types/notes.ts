export interface PropertyNote {
  id: string;
  propertyId: string;
  organizationId?: string;
  userId: string;
  noteType: string;
  title: string;
  content: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export const NOTE_TYPES = [
  'General',
  'Inspection',
  'Tenant Communication',
  'Maintenance',
  'Compliance',
  'Other'
] as const;

export type NoteType = typeof NOTE_TYPES[number];
