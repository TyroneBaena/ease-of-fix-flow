
import React from 'react';
import { Paperclip } from 'lucide-react';

interface RequestAttachmentsProps {
  attachments?: Array<{ url: string }> | null;
}

export const RequestAttachments = ({ attachments }: RequestAttachmentsProps) => {
  if (!attachments || attachments.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <h2 className="font-semibold mb-3 flex items-center">
        <Paperclip className="h-4 w-4 mr-2" />
        Attachments ({attachments.length})
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {attachments.map((attachment, index) => (
          <div key={index} className="rounded-lg overflow-hidden border bg-gray-50">
            <img 
              src={attachment.url} 
              alt={`Attachment ${index + 1}`}
              className="w-full h-full object-contain aspect-square"
            />
          </div>
        ))}
      </div>
    </div>
  );
};
