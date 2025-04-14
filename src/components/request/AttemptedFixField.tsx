
import React from 'react';
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { FormItem } from "@/components/ui/form";

interface AttemptedFixFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export const AttemptedFixField = ({ value, onChange }: AttemptedFixFieldProps) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <FormItem>
          <div className="space-y-2">
            <Label className="text-base font-semibold">
              What have you attempted to do to fix it?
            </Label>
            <p className="text-sm text-gray-500">
              Please ensure you have given a reasonable attempt to fixing an issue.
            </p>
            <Textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Describe what you've tried to fix the issue..."
              className="min-h-[120px] resize-y w-full"
              required
            />
          </div>
        </FormItem>
      </CardContent>
    </Card>
  );
};
