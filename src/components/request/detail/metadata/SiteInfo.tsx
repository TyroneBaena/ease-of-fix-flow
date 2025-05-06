
import React from 'react';
import { Tag } from 'lucide-react';

interface SiteInfoProps {
  site: string;
}

export const SiteInfo = ({ site }: SiteInfoProps) => {
  return (
    <div className="flex items-center">
      <Tag className="h-4 w-4 text-gray-500 mr-2" />
      <div>
        <p className="text-xs text-gray-500">Site</p>
        <p className="font-medium">{site}</p>
      </div>
    </div>
  );
};
