
import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { FormItem } from "@/components/ui/form";

interface IssueNatureFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export const IssueNatureField = ({ value, onChange }: IssueNatureFieldProps) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <FormItem>
          <div className="space-y-2">
            <Label className="text-base font-semibold">
              Title of the concern/issue/damage*
            </Label>
            <p className="text-sm text-gray-500">
              This is for the email subject (In 5 words or less)
            </p>
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Brief description of the issue"
              className="w-full"
              maxLength={50}
              required
            />
          </div>
        </FormItem>
      </CardContent>
    </Card>
  );
};
