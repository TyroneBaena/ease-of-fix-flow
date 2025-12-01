
import React, { useState } from 'react';
import { Paperclip, X, ZoomIn, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AddAttachmentsDialog } from '../AddAttachmentsDialog';

interface Attachment {
  url: string;
  name?: string;
  type?: string;
}

interface RequestAttachmentsProps {
  attachments?: Attachment[] | null;
  requestId?: string;
  onAttachmentsAdded?: () => void;
  canEdit?: boolean;
}

export const RequestAttachments = ({ 
  attachments, 
  requestId,
  onAttachmentsAdded,
  canEdit = false
}: RequestAttachmentsProps) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const openImageModal = (url: string) => {
    setSelectedImage(url);
    setIsModalOpen(true);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
    setIsModalOpen(false);
  };

  const showAddButton = canEdit && requestId && onAttachmentsAdded;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold flex items-center">
          <Paperclip className="h-4 w-4 mr-2" />
          Attachments ({attachments?.length || 0})
        </h2>
        {showAddButton && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Photos
          </Button>
        )}
      </div>

      {/* Empty State */}
      {(!attachments || !Array.isArray(attachments) || attachments.length === 0) ? (
        <p className="text-muted-foreground text-sm">No attachments uploaded</p>
      ) : (
        /* Attachment Grid */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {attachments.map((attachment, index) => (
            <div 
              key={index} 
              className="relative rounded-lg overflow-hidden border bg-muted/30 group cursor-pointer"
            >
              <img 
                src={attachment.url} 
                alt={attachment.name || `Attachment ${index + 1}`}
                className="w-full h-32 object-cover transition-transform group-hover:scale-105"
                onClick={() => openImageModal(attachment.url)}
                onError={(e) => {
                  console.error('Image failed to load:', attachment.url);
                }}
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center pointer-events-none">
                <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          ))}
        </div>
      )}

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
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Attachments Dialog */}
      {showAddButton && (
        <AddAttachmentsDialog
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          requestId={requestId}
          existingAttachments={attachments}
          onAttachmentsAdded={onAttachmentsAdded}
        />
      )}
    </div>
  );
};
