
import React from 'react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { FormItem } from "@/components/ui/form";

interface ParticipantRelatedFieldProps {
  value: boolean;
  onChange: (value: boolean) => void;
}

export const ParticipantRelatedField = ({ value, onChange }: ParticipantRelatedFieldProps) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <FormItem>
          <div className="space-y-2">
            <Label className="text-base font-semibold">
              Is it participant-related?
            </Label>
            <RadioGroup
              value={value ? "yes" : "no"}
              onValueChange={(newValue) => onChange(newValue === "yes")}
              className="flex flex-row space-x-4 pt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="participant-yes" />
                <Label htmlFor="participant-yes">Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="participant-no" />
                <Label htmlFor="participant-no">No</Label>
              </div>
            </RadioGroup>
          </div>
        </FormItem>
      </CardContent>
    </Card>
  );
};
