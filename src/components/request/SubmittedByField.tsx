
import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { FormItem } from "@/components/ui/form";

interface SubmittedByFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export const SubmittedByField = ({ value, onChange }: SubmittedByFieldProps) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <FormItem>
          <div className="space-y-2">
            <Label className="text-base font-semibold">
              Report/Request Submitted by
            </Label>
            <p className="text-sm text-gray-500">
              Please enter your first and last name
            </p>
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Your full name"
              className="w-full"
              required
            />
          </div>
        </FormItem>
      </CardContent>
    </Card>
  );
};
