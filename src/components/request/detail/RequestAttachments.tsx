
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

  console.log('RequestAttachments - received attachments:', attachments);
  console.log('RequestAttachments - attachments type:', typeof attachments);
  console.log('RequestAttachments - attachments length:', attachments?.length);

  if (!attachments || attachments.length === 0) {
    console.log('RequestAttachments - no attachments to display');
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

  const openImageModal = (url: string) => {
    setSelectedImage(url);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
  };

  return (
    <div className="mt-6">
      <h2 className="font-semibold mb-3 flex items-center">
        <Paperclip className="h-4 w-4 mr-2" />
        Attachments ({attachments.length})
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {attachments.map((attachment, index) => (
          <div key={index} className="relative rounded-lg overflow-hidden border bg-gray-50 group">
            <img 
              src={attachment.url} 
              alt={attachment.name || `Attachment ${index + 1}`}
              className="w-full h-32 object-cover cursor-pointer transition-transform group-hover:scale-105"
              onClick={() => openImageModal(attachment.url)}
              onError={(e) => {
                console.error('Image failed to load:', attachment.url);
                console.error('Error event:', e);
              }}
              onLoad={() => {
                console.log('Image loaded successfully:', attachment.url);
              }}
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
              <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        ))}
      </div>

      {/* Image Modal */}
      <Dialog open={!!selectedImage} onOpenChange={() => closeImageModal()}>
        <DialogContent className="max-w-4xl w-full p-0">
          <DialogTitle className="sr-only">
            Image Preview
          </DialogTitle>
          <div className="relative">
            <Button
              variant="outline"
              size="icon"
              className="absolute top-4 right-4 z-10 bg-white/90 hover:bg-white"
              onClick={closeImageModal}
            >
              <X className="h-4 w-4" />
            </Button>
            {selectedImage && (
              <img 
                src={selectedImage} 
                alt="Full size attachment"
                className="w-full h-auto max-h-[80vh] object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
