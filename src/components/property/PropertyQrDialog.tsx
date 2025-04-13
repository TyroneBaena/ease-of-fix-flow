
import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download } from 'lucide-react';

interface PropertyQrDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyName: string;
  qrCodeUrl: string;
  onDownload: () => void;
}

export const PropertyQrDialog: React.FC<PropertyQrDialogProps> = ({
  open,
  onOpenChange,
  propertyName,
  qrCodeUrl,
  onDownload
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Property QR Code</DialogTitle>
          <DialogDescription>
            Scan this code to create a maintenance request for {propertyName}.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center py-6">
          <div className="border p-4 rounded-lg">
            <QRCodeSVG value={qrCodeUrl} size={200} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button type="button" onClick={onDownload} className="flex items-center">
            <Download className="mr-2 h-4 w-4" />
            Download QR Code
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
