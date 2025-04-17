
import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface IncludeInfoSectionProps {
  includeInfo: {
    description: boolean;
    location: boolean;
    images: boolean;
    contactDetails: boolean;
    urgency: boolean;
  };
  onInfoToggle: (infoType: string) => void;
}

export const IncludeInfoSection = ({
  includeInfo,
  onInfoToggle
}: IncludeInfoSectionProps) => {
  return (
    <div>
      <h3 className="text-sm font-medium mb-3">Information to Include</h3>
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="include-description"
            checked={includeInfo.description}
            onCheckedChange={() => onInfoToggle('description')}
          />
          <Label htmlFor="include-description">Issue description</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="include-location"
            checked={includeInfo.location}
            onCheckedChange={() => onInfoToggle('location')}
          />
          <Label htmlFor="include-location">Location details</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="include-images"
            checked={includeInfo.images}
            onCheckedChange={() => onInfoToggle('images')}
          />
          <Label htmlFor="include-images">Images & attachments</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="include-contact"
            checked={includeInfo.contactDetails}
            onCheckedChange={() => onInfoToggle('contactDetails')}
          />
          <Label htmlFor="include-contact">Contact details</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="include-urgency"
            checked={includeInfo.urgency}
            onCheckedChange={() => onInfoToggle('urgency')}
          />
          <Label htmlFor="include-urgency">Urgency/priority level</Label>
        </div>
      </div>
    </div>
  );
};
