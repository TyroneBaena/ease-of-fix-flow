
import React from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { MapPin, Edit, Trash, QrCode } from 'lucide-react';
import { Property } from '@/types/property';

interface PropertyHeaderProps {
  property: Property;
  onDeleteProperty: () => void;
  onOpenQrDialog: () => void;
  setDialogOpen: (isOpen: boolean) => void;
  dialogOpen: boolean;
}

export const PropertyHeader: React.FC<PropertyHeaderProps> = ({ 
  property, 
  onDeleteProperty,
  onOpenQrDialog,
  setDialogOpen,
  dialogOpen
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{property.name}</h1>
        <div className="flex items-center text-gray-600 mt-1">
          <MapPin className="h-4 w-4 mr-1" />
          {property.address}
        </div>
      </div>
      
      <div className="flex space-x-2 mt-4 md:mt-0">
        <Button
          variant="outline"
          onClick={onOpenQrDialog}
          className="flex items-center"
        >
          <QrCode className="mr-2 h-4 w-4" />
          View QR Code
        </Button>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex items-center">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </DialogTrigger>
        </Dialog>
        
        <Button
          variant="destructive"
          onClick={onDeleteProperty}
          className="flex items-center"
        >
          <Trash className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </div>
    </div>
  );
};
