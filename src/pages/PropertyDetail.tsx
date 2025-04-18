
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePropertyContext } from '@/contexts/property/PropertyContext';
import { useMaintenanceRequestContext } from '@/contexts/maintenance';
import Navbar from '@/components/Navbar';
import { generateQRCodeUrl } from '@/utils/qrCodeGenerator';
import { toast } from '@/lib/toast';
import { PropertyForm } from '@/components/property/PropertyForm';
import { PropertyHeader } from '@/components/property/PropertyHeader';
import { PropertyInfo } from '@/components/property/PropertyInfo';
import { PropertyRequests } from '@/components/property/PropertyRequests';
import { PropertyQuickActions } from '@/components/property/PropertyQuickActions';
import { PropertyQrDialog } from '@/components/property/PropertyQrDialog';
import { 
  Dialog,
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { MaintenanceRequest } from '@/types/maintenance';

const PropertyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getProperty, deleteProperty } = usePropertyContext();
  const { getRequestsForProperty } = useMaintenanceRequestContext();
  const [property, setProperty] = useState(id ? getProperty(id) : undefined);
  const [requests, setRequests] = useState<MaintenanceRequest[]>(id ? getRequestsForProperty(id) : []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);

  useEffect(() => {
    if (id) {
      const propertyData = getProperty(id);
      if (propertyData) {
        setProperty(propertyData);
        setRequests(getRequestsForProperty(id));
      } else {
        toast.error('Property not found');
        navigate('/properties');
      }
    }
  }, [id, getProperty, getRequestsForProperty, navigate]);

  const handleDeleteProperty = () => {
    if (id) {
      deleteProperty(id);
      toast.success('Property deleted successfully');
      navigate('/properties');
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    if (id) {
      setProperty(getProperty(id));
    }
  };

  const handleQrDownload = () => {
    toast.success(`QR Code for ${property.name} downloaded`);
  };

  if (!property) {
    return <div>Loading...</div>;
  }

  const qrCodeUrl = id ? generateQRCodeUrl(id) : '';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PropertyHeader 
          property={property}
          onDeleteProperty={handleDeleteProperty}
          onOpenQrDialog={() => setQrDialogOpen(true)}
          setDialogOpen={setDialogOpen}
          dialogOpen={dialogOpen}
        />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <PropertyInfo property={property} />
            {id && <PropertyRequests requests={requests as any} propertyId={id} />}
          </div>
          
          <div>
            {id && (
              <PropertyQuickActions
                propertyId={id}
                onOpenQrDialog={() => setQrDialogOpen(true)}
                onOpenEditDialog={() => setDialogOpen(true)}
              />
            )}
          </div>
        </div>
      </main>
      
      {id && (
        <PropertyQrDialog
          open={qrDialogOpen}
          onOpenChange={setQrDialogOpen}
          propertyName={property.name}
          qrCodeUrl={qrCodeUrl}
          onDownload={handleQrDownload}
        />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Property</DialogTitle>
            <DialogDescription>
              Update the details for this property.
            </DialogDescription>
          </DialogHeader>
          <PropertyForm onClose={handleDialogClose} existingProperty={property} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PropertyDetail;
