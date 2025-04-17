
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DollarSign } from 'lucide-react';
import { DialogFooter } from '@/components/ui/dialog';

interface QuoteFormProps {
  amount: string;
  description: string;
  onAmountChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export const QuoteForm: React.FC<QuoteFormProps> = ({
  amount,
  description,
  onAmountChange,
  onDescriptionChange,
  onSubmit,
  onCancel,
}) => {
  return (
    <form onSubmit={onSubmit}>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="amount">Quote Amount</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-gray-500" />
            <Input
              id="amount"
              type="number"
              placeholder="0.00"
              className="pl-10"
              value={amount}
              onChange={(e) => onAmountChange(e.target.value)}
              required
              min="0"
              step="0.01"
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="description">Quote Details</Label>
          <Textarea
            id="description"
            placeholder="Provide details about the quote, including materials, labor, and timeline..."
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            required
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Submit Quote</Button>
      </DialogFooter>
    </form>
  );
};
