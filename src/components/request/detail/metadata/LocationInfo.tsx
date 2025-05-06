
import React from 'react';
import { MapPin } from 'lucide-react';

interface LocationInfoProps {
  location: string;
}

export const LocationInfo = ({ location }: LocationInfoProps) => {
  return (
    <div className="flex items-center">
      <MapPin className="h-4 w-4 text-gray-500 mr-2" />
      <div>
        <p className="text-xs text-gray-500">Location</p>
        <p className="font-medium">{location}</p>
      </div>
    </div>
  );
};
