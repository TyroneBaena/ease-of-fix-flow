import React from 'react';
import { FileIcon, ImageIcon, FileText, Download, ExternalLink } from 'lucide-react';
import { NoteAttachment } from '@/types/notes';
import { Button } from '@/components/ui/button';

interface NoteAttachmentsProps {
  attachments: NoteAttachment[];
  compact?: boolean;
}

export function NoteAttachments({ attachments, compact = false }: NoteAttachmentsProps) {
  if (!attachments || attachments.length === 0) return null;

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return ImageIcon;
    if (type.includes('pdf')) return FileText;
    return FileIcon;
  };

  const isImage = (type: string) => type.startsWith('image/');

  if (compact) {
    return (
      <div className="flex items-center gap-1 text-muted-foreground">
        <FileIcon className="h-3 w-3" />
        <span className="text-xs">{attachments.length}</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">
        Attachments ({attachments.length})
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {attachments.map((attachment, index) => {
          const Icon = getFileIcon(attachment.type);
          
          return (
            <div
              key={index}
              className="group relative border rounded-lg overflow-hidden bg-muted/50"
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
                  <Icon className="h-8 w-8 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground mt-1 truncate max-w-full px-1">
                    {attachment.name}
                  </span>
                </div>
              )}
              <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => window.open(attachment.url, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  asChild
                >
                  <a href={attachment.url} download={attachment.name}>
                    <Download className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
