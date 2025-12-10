import React, { useCallback, useState } from 'react';
import { Upload, X, FileIcon, ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NoteAttachment } from '@/types/notes';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AttachmentUploaderProps {
  attachments: NoteAttachment[];
  onAttachmentsChange: (attachments: NoteAttachment[]) => void;
  propertyId: string;
}

export function AttachmentUploader({
  attachments: rawAttachments,
  onAttachmentsChange,
  propertyId,
}: AttachmentUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  // Defensive array check
  const attachments = Array.isArray(rawAttachments) ? rawAttachments : [];

  const uploadFile = async (file: File): Promise<NoteAttachment | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `property-note-attachments/${propertyId}/${fileName}`;

    const { error } = await supabase.storage
      .from('maintenance-files')
      .upload(filePath, file);

    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('maintenance-files')
      .getPublicUrl(filePath);

    return {
      url: publicUrl,
      name: file.name,
      type: file.type,
    };
  };

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setUploading(true);
    const newAttachments: NoteAttachment[] = [];

    for (const file of fileArray) {
      const attachment = await uploadFile(file);
      if (attachment) {
        newAttachments.push(attachment);
      } else {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    if (newAttachments.length > 0) {
      onAttachmentsChange([...attachments, ...newAttachments]);
    }
    setUploading(false);
  }, [attachments, onAttachmentsChange, propertyId]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const removeAttachment = (index: number) => {
    const newAttachments = attachments.filter((_, i) => i !== index);
    onAttachmentsChange(newAttachments);
  };

  const isImage = (type: string) => type.startsWith('image/');

  return (
    <div className="space-y-3">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
          dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
        }`}
      >
        <input
          type="file"
          id="note-file-upload"
          className="hidden"
          multiple
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        <label
          htmlFor="note-file-upload"
          className="cursor-pointer flex flex-col items-center gap-2"
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
          ) : (
            <Upload className="h-8 w-8 text-muted-foreground" />
          )}
          <span className="text-sm text-muted-foreground">
            {uploading ? 'Uploading...' : 'Drop files here or click to upload'}
          </span>
        </label>
      </div>

      {attachments.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {attachments.map((attachment, index) => (
            <div
              key={index}
              className="relative group border rounded-lg overflow-hidden bg-muted/50"
            >
              {isImage(attachment.type) ? (
                <div className="aspect-square">
                  <img
                    src={attachment.url}
                    alt={attachment.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-square flex flex-col items-center justify-center p-2">
                  <FileIcon className="h-8 w-8 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground mt-1 truncate max-w-full px-1">
                    {attachment.name}
                  </span>
                </div>
              )}
              <Button
                size="icon"
                variant="destructive"
                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeAttachment(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
