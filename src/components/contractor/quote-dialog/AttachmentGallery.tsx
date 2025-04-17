
import React from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface AttachmentGalleryProps {
  attachments?: Array<{ url: string }>;
  isLoading?: boolean;
}

export const AttachmentGallery: React.FC<AttachmentGalleryProps> = ({ attachments, isLoading }) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <ImageIcon className="h-4 w-4" />
          Photos
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 auto-rows-[160px]">
          {[1, 2, 3, 4].map((index) => (
            <Skeleton 
              key={index} 
              className="w-full h-full rounded-md animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!attachments?.length) return null;

  return (
    <div className="space-y-4">
      <h3 className="font-semibold flex items-center gap-2">
        <ImageIcon className="h-4 w-4" />
        Photos ({attachments.length})
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 auto-rows-[160px]">
        {attachments.map((attachment, index) => (
          <div key={index} className="relative group overflow-hidden rounded-md">
            <img
              src={attachment.url}
              alt={`Attachment ${index + 1}`}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        ))}
      </div>
    </div>
  );
};
