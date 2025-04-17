
import React, { useState } from 'react';
import { Image as ImageIcon, ZoomIn } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageLightbox } from './ImageLightbox';
import { Button } from '@/components/ui/button';

interface AttachmentGalleryProps {
  attachments?: Array<{ url: string }>;
  isLoading?: boolean;
}

export const AttachmentGallery: React.FC<AttachmentGalleryProps> = ({ attachments, isLoading }) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

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
          <div key={index} className="relative group overflow-hidden rounded-md cursor-pointer">
            <img
              src={attachment.url}
              alt={`Attachment ${index + 1}`}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
              loading="lazy"
            />
            <div 
              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center"
              onClick={() => {
                setCurrentImageIndex(index);
                setLightboxOpen(true);
              }}
            >
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <ZoomIn className="h-6 w-6" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <ImageLightbox
        images={attachments}
        currentIndex={currentImageIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onNavigate={setCurrentImageIndex}
      />
    </div>
  );
};
