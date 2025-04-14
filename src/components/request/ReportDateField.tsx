
import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { FormItem } from "@/components/ui/form";

interface ReportDateFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export const ReportDateField = ({ value, onChange }: ReportDateFieldProps) => {
  // Get today's date in the format DD/MM/YYYY
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  const formattedDate = `${day}/${month}/${year}`;
  
  React.useEffect(() => {
    // Set default date if not already set
    if (!value) {
      onChange(formattedDate);
    }
  }, []);

  return (
    <Card>
      <CardContent className="pt-6">
        <FormItem>
          <div className="space-y-2">
            <Label className="text-base font-semibold">
              Date of Report/Request
            </Label>
            <p className="text-sm text-gray-500">
              Format: dd/MM/yyyy
            </p>
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="DD/MM/YYYY"
              className="w-full"
              pattern="\d{2}/\d{2}/\d{4}"
              required
            />
          </div>
        </FormItem>
      </CardContent>
    </Card>
  );
};
