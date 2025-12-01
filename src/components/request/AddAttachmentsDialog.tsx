import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, X, Loader2, ImagePlus } from 'lucide-react';
import { useAddAttachments } from '@/hooks/useAddAttachments';
import { useUserContext } from '@/contexts/UnifiedAuthContext';

interface Attachment {
  url: string;
  name?: string;
  type?: string;
}

interface AddAttachmentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  existingAttachments: Attachment[] | null;
  onAttachmentsAdded: () => void;
}

export const AddAttachmentsDialog = ({
  open,
  onOpenChange,
  requestId,
  existingAttachments,
  onAttachmentsAdded
}: AddAttachmentsDialogProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addAttachments, isAdding, isUploading } = useAddAttachments();
  const { currentUser } = useUserContext();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
      
      // Create preview URLs
      const newPreviewUrls = newFiles.map(file => URL.createObjectURL(file));
      setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
    }
  };

  const handleRemoveFile = (index: number) => {
    URL.revokeObjectURL(previewUrls[index]);
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    const normalizedAttachments = existingAttachments?.map(a => ({
      url: a.url,
      name: a.name || '',
      type: a.type || ''
    })) || null;

    // Pass uploader name for notifications
    const uploaderName = currentUser?.name || currentUser?.email || 'User';
    const result = await addAttachments(requestId, files, normalizedAttachments, uploaderName);
    
    if (result) {
      // Cleanup
      previewUrls.forEach(url => URL.revokeObjectURL(url));
      setFiles([]);
      setPreviewUrls([]);
      onOpenChange(false);
      onAttachmentsAdded();
    }
  };

  const handleClose = () => {
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    setFiles([]);
    setPreviewUrls([]);
    onOpenChange(false);
  };

  const isLoading = isAdding || isUploading;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImagePlus className="h-5 w-5" />
            Add Attachments
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Input */}
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-6 bg-muted/30">
            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              Upload photos or videos
            </p>
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              Select Files
            </Button>
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Selected Files Count */}
          {files.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {files.length} file(s) selected
            </p>
          )}

          {/* Preview Grid */}
          {previewUrls.length > 0 && (
            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {previewUrls.map((url, index) => (
                <div key={index} className="relative group">
                  <img
                    src={url}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-20 object-cover rounded-md border"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleRemoveFile(index)}
                    disabled={isLoading}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={files.length === 0 || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
