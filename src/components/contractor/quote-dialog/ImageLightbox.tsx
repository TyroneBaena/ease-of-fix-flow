
import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageLightboxProps {
  images: Array<{ url: string }>;
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  images,
  currentIndex,
  isOpen,
  onClose,
  onNavigate,
}) => {
  const hasMultipleImages = images.length > 1;
  
  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl p-0 bg-black/90">
        <div className="relative flex items-center justify-center min-h-[300px] sm:min-h-[400px] md:min-h-[500px]">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 text-white hover:bg-white/20"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
          
          {hasMultipleImages && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 text-white hover:bg-white/20"
                onClick={() => onNavigate(currentIndex - 1)}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 text-white hover:bg-white/20"
                onClick={() => onNavigate(currentIndex + 1)}
                disabled={currentIndex === images.length - 1}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}
          
          <img
            src={images[currentIndex].url}
            alt={`Image ${currentIndex + 1}`}
            className="max-h-[80vh] max-w-full object-contain"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
