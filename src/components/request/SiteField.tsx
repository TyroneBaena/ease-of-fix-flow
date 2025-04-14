
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { FormItem } from "@/components/ui/form";
import { Property } from "@/types/property";

interface SiteFieldProps {
  value: string;
  onChange: (value: string) => void;
  properties: Property[];
}

export const SiteField = ({ value, onChange, properties }: SiteFieldProps) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <FormItem>
          <div className="space-y-2">
            <Label className="text-base font-semibold">
              Site
            </Label>
            <Select value={value} onValueChange={onChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select site" />
              </SelectTrigger>
              <SelectContent>
                {properties.map((property) => (
                  <SelectItem key={property.id} value={property.name}>
                    {property.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </FormItem>
      </CardContent>
    </Card>
  );
};
