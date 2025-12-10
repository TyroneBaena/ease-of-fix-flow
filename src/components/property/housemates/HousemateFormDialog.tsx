import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Housemate, RENT_PERIODS, RENT_PERIOD_LABELS, RentPeriod } from '@/types/housemate';

interface HousemateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingHousemate?: Housemate | null;
  onSubmit: (data: {
    firstName: string;
    lastName: string;
    rentUtilitiesAmount?: number;
    rentPeriod: RentPeriod;
    personalProfile?: string;
  }) => Promise<boolean>;
}

export const HousemateFormDialog: React.FC<HousemateFormDialogProps> = ({
  open,
  onOpenChange,
  editingHousemate,
  onSubmit,
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [rentUtilitiesAmount, setRentUtilitiesAmount] = useState('');
  const [rentPeriod, setRentPeriod] = useState<RentPeriod>('week');
  const [personalProfile, setPersonalProfile] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editingHousemate) {
      setFirstName(editingHousemate.firstName);
      setLastName(editingHousemate.lastName);
      setRentUtilitiesAmount(
        editingHousemate.rentUtilitiesAmount?.toString() || ''
      );
      setRentPeriod(editingHousemate.rentPeriod);
      setPersonalProfile(editingHousemate.personalProfile || '');
    } else {
      setFirstName('');
      setLastName('');
      setRentUtilitiesAmount('');
      setRentPeriod('week');
      setPersonalProfile('');
    }
  }, [editingHousemate, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const success = await onSubmit({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      rentUtilitiesAmount: rentUtilitiesAmount ? parseFloat(rentUtilitiesAmount) : undefined,
      rentPeriod,
      personalProfile: personalProfile.trim() || undefined,
    });

    setSubmitting(false);
    if (success) {
      onOpenChange(false);
    }
  };

  const isValid = firstName.trim() && lastName.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {editingHousemate ? 'Edit Housemate' : 'Add Housemate'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter first name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter last name"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rentAmount">Rent & Utilities Amount</Label>
              <Input
                id="rentAmount"
                type="number"
                min="0"
                step="0.01"
                value={rentUtilitiesAmount}
                onChange={(e) => setRentUtilitiesAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rentPeriod">Payment Period</Label>
              <Select value={rentPeriod} onValueChange={(v) => setRentPeriod(v as RentPeriod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RENT_PERIODS.map((period) => (
                    <SelectItem key={period} value={period}>
                      {RENT_PERIOD_LABELS[period]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="personalProfile">Personal Profile</Label>
            <Textarea
              id="personalProfile"
              value={personalProfile}
              onChange={(e) => setPersonalProfile(e.target.value)}
              placeholder="Add notes about this housemate..."
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || submitting}>
              {submitting ? 'Saving...' : editingHousemate ? 'Save Changes' : 'Add Housemate'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
