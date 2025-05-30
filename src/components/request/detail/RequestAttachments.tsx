
import React, { useState } from 'react';
import { Paperclip, X, ZoomIn } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Attachment {
  url: string;
  name?: string;
  type?: string;
}

interface RequestAttachmentsProps {
  attachments?: Attachment[] | null;
}

export const RequestAttachments = ({ attachments }: RequestAttachmentsProps) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  console.log('RequestAttachments - received attachments:', attachments);
  console.log('RequestAttachments - attachments type:', typeof attachments);
  console.log('RequestAttachments - attachments length:', attachments?.length);
  console.log('RequestAttachments - is array?', Array.isArray(attachments));

  // Check if attachments is null, undefined, or empty array
  if (!attachments || !Array.isArray(attachments) || attachments.length === 0) {
    console.log('RequestAttachments - no attachments to display, reason:', {
      isNull: attachments === null,
      isUndefined: attachments === undefined,
      isArray: Array.isArray(attachments),
      length: attachments?.length
    });
    return (
      <div className="mt-6">
        <h2 className="font-semibold mb-3 flex items-center">
          <Paperclip className="h-4 w-4 mr-2" />
          Attachments (0)
        </h2>
        <p className="text-gray-500 text-sm">No attachments uploaded</p>
      </div>
    );
  }

  console.log('RequestAttachments - displaying attachments:', attachments);

  const openImageModal = (url: string) => {
    console.log('RequestAttachments - opening image modal for:', url);
    setSelectedImage(url);
    setIsModalOpen(true);
  };

  const closeImageModal = () => {
    console.log('RequestAttachments - closing image modal');
    setSelectedImage(null);
    setIsModalOpen(false);
  };

  return (
    <div className="mt-6">
      <h2 className="font-semibold mb-3 flex items-center">
        <Paperclip className="h-4 w-4 mr-2" />
        Attachments ({attachments.length})
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {attachments.map((attachment, index) => {
          console.log('RequestAttachments - rendering attachment:', attachment, 'at index:', index);
          return (
            <div key={index} className="relative rounded-lg overflow-hidden border bg-gray-50 group cursor-pointer">
              <img 
                src={attachment.url} 
                alt={attachment.name || `Attachment ${index + 1}`}
                className="w-full h-32 object-cover transition-transform group-hover:scale-105"
                onClick={() => openImageModal(attachment.url)}
                onError={(e) => {
                  console.error('Image failed to load:', attachment.url);
                  console.error('Error event:', e);
                }}
                onLoad={() => {
                  console.log('Image loaded successfully:', attachment.url);
                }}
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center pointer-events-none">
                <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Image Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl w-full p-0 bg-black/90">
          <DialogTitle className="sr-only">
            Image Preview
          </DialogTitle>
          <div className="relative min-h-[300px] flex items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
              onClick={closeImageModal}
            >
              <X className="h-4 w-4" />
            </Button>
            {selectedImage && (
              <img 
                src={selectedImage} 
                alt="Full size attachment"
                className="max-w-full max-h-[80vh] object-contain"
                onError={(e) => {
                  console.error('Modal image failed to load:', selectedImage);
                }}
                onLoad={() => {
                  console.log('Modal image loaded successfully:', selectedImage);
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
