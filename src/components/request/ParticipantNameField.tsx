
import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { FormItem } from "@/components/ui/form";

interface ParticipantNameFieldProps {
  value: string;
  onChange: (value: string) => void;
  isParticipantRelated: boolean;
}

export const ParticipantNameField = ({ value, onChange, isParticipantRelated }: ParticipantNameFieldProps) => {
  if (!isParticipantRelated) {
    return null;
  }
  
  return (
    <Card>
      <CardContent className="pt-6">
        <FormItem>
          <div className="space-y-2">
            <Label className="text-base font-semibold">
              Participant's Name
            </Label>
            <p className="text-sm text-gray-500">
              If the concern is participant-related, kindly indicate the participant's first name and the first initial of the last name (e.g., place "James L." instead of James Lucas)
            </p>
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Enter participant name (e.g., James L.)"
              className="w-full"
              required={isParticipantRelated}
            />
          </div>
        </FormItem>
      </CardContent>
    </Card>
  );
};
