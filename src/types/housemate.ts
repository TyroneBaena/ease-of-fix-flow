export interface Housemate {
  id: string;
  propertyId: string;
  organizationId?: string;
  firstName: string;
  lastName: string;
  rentUtilitiesAmount?: number;
  rentPeriod: 'week' | 'fortnight' | 'month';
  personalProfile?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export const RENT_PERIODS = ['week', 'fortnight', 'month'] as const;
export type RentPeriod = typeof RENT_PERIODS[number];

export const RENT_PERIOD_LABELS: Record<RentPeriod, string> = {
  week: 'Week',
  fortnight: 'Fortnight',
  month: 'Month',
};
