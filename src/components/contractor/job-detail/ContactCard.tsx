
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface ContactCardProps {
  practiceLeader?: string;
  practiceLeaderPhone?: string;
  address?: string;
}

export const ContactCard = ({ practiceLeader, practiceLeaderPhone, address }: ContactCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {practiceLeader && (
          <div>
            <dt className="text-sm font-medium text-gray-500">Practice Leader</dt>
            <dd className="mt-1 text-sm text-gray-900">{practiceLeader}</dd>
          </div>
        )}
        
        {practiceLeaderPhone && (
          <div>
            <dt className="text-sm font-medium text-gray-500">Phone</dt>
            <dd className="mt-1 text-sm text-gray-900">
              <a href={`tel:${practiceLeaderPhone}`} className="text-blue-600 hover:underline">
                {practiceLeaderPhone}
              </a>
            </dd>
          </div>
        )}
        
        {address && (
          <div>
            <dt className="text-sm font-medium text-gray-500">Address</dt>
            <dd className="mt-1 text-sm text-gray-900">{address}</dd>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
