
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Paperclip, ZoomIn, X, Download } from 'lucide-react';

interface Attachment {
  url: string;
  name?: string;
  type?: string;
}

interface AttachmentsCardProps {
  attachments: Attachment[] | null | undefined;
}

export const AttachmentsCard = ({ attachments }: AttachmentsCardProps) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  console.log('AttachmentsCard - received attachments:', attachments);

  const openImageModal = (url: string) => {
    setSelectedImage(url);
    setIsModalOpen(true);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
    setIsModalOpen(false);
  };

  const downloadImage = (url: string, name?: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = name || 'attachment';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!attachments || !Array.isArray(attachments) || attachments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Paperclip className="h-5 w-5 mr-2" />
            Attachments (0)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Paperclip className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No attachments uploaded</p>
            <p className="text-sm">Photos and documents will appear here when uploaded</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Paperclip className="h-5 w-5 mr-2" />
            Attachments ({attachments.length})
          </div>
          <span className="text-sm font-normal text-muted-foreground">
            Click to view full size
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {attachments.map((attachment, index) => (
            <div key={index} className="relative group">
              <div className="relative rounded-lg overflow-hidden border bg-gray-50 aspect-square cursor-pointer hover:shadow-md transition-shadow">
                <img 
                  src={attachment.url} 
                  alt={attachment.name || `Attachment ${index + 1}`}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  onClick={() => openImageModal(attachment.url)}
                  onError={(e) => {
                    console.error('Image failed to load:', attachment.url);
                    // Replace with a placeholder or error state
                    const target = e.target as HTMLImageElement;
                    target.src = '/placeholder.svg';
                  }}
                  onLoad={() => {
                    console.log('Image loaded successfully:', attachment.url);
                  }}
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        openImageModal(attachment.url);
                      }}
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadImage(attachment.url, attachment.name);
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              {attachment.name && (
                <p className="mt-2 text-sm text-center text-muted-foreground truncate">
                  {attachment.name}
                </p>
              )}
            </div>
          ))}
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
      </CardContent>
    </Card>
  );
};
