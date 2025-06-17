
import { Property } from './property';

export interface PropertyFormData extends Omit<Property, 'id' | 'createdAt'> {}

export interface UsePropertyFormProps {
  existingProperty?: Omit<Property, 'createdAt'> & {
    id: string;
    name: string;
    address: string;
    contactNumber: string;
    email: string;
    practiceLeader: string;
    practiceLeaderEmail: string;
    practiceLeaderPhone: string;
    renewalDate: string;
    rentAmount: number;
    rentPeriod: 'week' | 'month';
  };
  onClose: () => void;
}

export interface PropertyFormFieldProps {
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export interface BasicInfoFieldProps extends PropertyFormFieldProps {
  name: string;
  address: string;
  contactNumber: string;
  email: string;
}

export interface RentalFieldsProps extends PropertyFormFieldProps {
  renewalDate: string;
  rentAmount: number;
  rentPeriod: 'week' | 'month';
  onRentPeriodChange: (value: 'week' | 'month') => void;
}

export interface PracticeLeaderFieldsProps extends PropertyFormFieldProps {
  managers: Array<{
    id: string;
    name: string;
    email: string;
  }>;
  practiceLeader: string;
  practiceLeaderEmail: string;
  practiceLeaderPhone: string;
  onPracticeLeaderChange: (userId: string) => void;
}
