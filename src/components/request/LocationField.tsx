
import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { FormItem } from "@/components/ui/form";

interface LocationFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export const LocationField = ({ value, onChange }: LocationFieldProps) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <FormItem>
          <div className="space-y-2">
            <Label className="text-base font-semibold">
              Where in the property is the issue/concern located?*
            </Label>
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Specific location of the issue"
              className="w-full"
              required
            />
          </div>
        </FormItem>
      </CardContent>
    </Card>
  );
};
