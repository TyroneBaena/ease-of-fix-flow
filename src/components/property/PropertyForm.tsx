
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BasicInfoFields } from './form/BasicInfoFields';
import { PracticeLeaderFields } from './form/PracticeLeaderFields';
import { RentalFields } from './form/RentalFields';
import { LandlordFields } from './form/LandlordFields';
import { GoogleMapsSettings } from '@/components/maps/GoogleMapsSettings';
import { usePropertyForm } from '@/hooks/usePropertyForm';
import { Property } from '@/types/property';

interface PropertyFormProps {
  onClose: () => void;
  existingProperty?: Omit<Property, 'createdAt'> & {
    id: string;
    name: string;
    address: string;
    contactNumber: string;
    email: string;
    practiceLeader: string;
    practiceLeaderEmail: string;
    practiceLeaderPhone: string;
    renewalDate: string;
    rentAmount: number;
    rentPeriod: 'week' | 'month';
    landlordId?: string;
  };
}

export const PropertyForm: React.FC<PropertyFormProps> = ({ onClose, existingProperty }) => {
  const isEditing = !!existingProperty;
  const [activeTab, setActiveTab] = useState('property');
  const { 
    form, 
    managers, 
    handleChange, 
    handleRentPeriodChange,
    handlePracticeLeaderChange, 
    handleLandlordChange,
    handleSubmit 
  } = usePropertyForm({ existingProperty, onClose });

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="property">Property Details</TabsTrigger>
        <TabsTrigger value="maps">Google Maps</TabsTrigger>
      </TabsList>
      
      <TabsContent value="property" className="space-y-4">
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <BasicInfoFields
              name={form.name}
              address={form.address}
              contactNumber={form.contactNumber}
              email={form.email}
              onChange={handleChange}
            />
            
            <PracticeLeaderFields
              managers={managers}
              practiceLeader={form.practiceLeader}
              practiceLeaderEmail={form.practiceLeaderEmail}
              practiceLeaderPhone={form.practiceLeaderPhone}
              onPracticeLeaderChange={handlePracticeLeaderChange}
              onChange={handleChange}
            />

            <LandlordFields
              landlordId={form.landlordId}
              onChange={handleLandlordChange}
            />
            
            <RentalFields
              renewalDate={form.renewalDate}
              rentAmount={form.rentAmount}
              rentPeriod={form.rentPeriod}
              onChange={handleChange}
              onRentPeriodChange={handleRentPeriodChange}
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">{isEditing ? 'Update' : 'Add'} Property</Button>
          </DialogFooter>
        </form>
      </TabsContent>
      
      <TabsContent value="maps" className="space-y-4">
        <div className="py-4">
          <GoogleMapsSettings />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </TabsContent>
    </Tabs>
  );
};
