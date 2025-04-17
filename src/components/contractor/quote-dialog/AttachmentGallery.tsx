
import React from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface AttachmentGalleryProps {
  attachments?: Array<{ url: string }>;
}

export const AttachmentGallery: React.FC<AttachmentGalleryProps> = ({ attachments }) => {
  if (!attachments?.length) return null;

  return (
    <div className="space-y-4">
      <h3 className="font-semibold flex items-center gap-2">
        <ImageIcon className="h-4 w-4" />
        Photos
      </h3>
      <div className="grid grid-cols-2 gap-4">
        {attachments.map((attachment, index) => (
          <img
            key={index}
            src={attachment.url}
            alt={`Attachment ${index + 1}`}
            className="rounded-md border border-gray-200 object-cover w-full aspect-video"
          />
        ))}
      </div>
    </div>
  );
};
