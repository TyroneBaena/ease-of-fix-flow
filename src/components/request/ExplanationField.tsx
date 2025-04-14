
import React from 'react';
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { FormItem } from "@/components/ui/form";

interface ExplanationFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export const ExplanationField = ({ value, onChange }: ExplanationFieldProps) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <FormItem>
          <div className="space-y-2">
            <Label className="text-base font-semibold">
              Please explain the repair/damage/modification
            </Label>
            <p className="text-sm text-gray-500">
              Let us know What happened? Why it happened? How it happened? Please provide a clear picture of the maintenance issue and what is needed to be fixed answering all the questions above. If questions above are not answered, the information will be requested again.
            </p>
            <Textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Detailed explanation of the issue..."
              className="min-h-[150px] resize-y w-full"
              required
            />
          </div>
        </FormItem>
      </CardContent>
    </Card>
  );
};
