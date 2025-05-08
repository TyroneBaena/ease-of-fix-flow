
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface Attachment {
  url: string;
}

interface AttachmentsCardProps {
  attachments: Attachment[] | null | undefined;
}

export const AttachmentsCard = ({ attachments }: AttachmentsCardProps) => {
  if (!attachments || attachments.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attachments</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {attachments.map((attachment, index) => (
            <a 
              key={index}
              href={attachment.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block border rounded-md overflow-hidden hover:opacity-80 transition-opacity"
            >
              <img 
                src={attachment.url} 
                alt={`Attachment ${index + 1}`}
                className="w-full h-32 object-cover"
              />
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
