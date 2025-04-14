
import React from 'react';
import { useParams } from 'react-router-dom';
import { usePropertyContext } from '@/contexts/property/PropertyContext';
import { useMaintenanceRequestContext } from '@/contexts/MaintenanceRequestContext';
import { Property } from '@/types/property';
import PropertyAccessControl from './PropertyAccessControl';

interface PropertyDetailProps {
  property: Property;
}

const PropertyDetail: React.FC<PropertyDetailProps> = ({ property }) => {
  const { getRequestsForProperty } = useMaintenanceRequestContext();
  const propertyRequests = getRequestsForProperty(property.id);

  return (
    <PropertyAccessControl propertyId={property.id}>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">{property.name}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Property Information</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Address:</span> {property.address}</p>
              <p><span className="font-medium">Contact:</span> {property.contactNumber}</p>
              <p><span className="font-medium">Email:</span> {property.email}</p>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Practice Details</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Practice Leader:</span> {property.practiceLeader}</p>
              <p><span className="font-medium">Email:</span> {property.practiceLeaderEmail}</p>
              <p><span className="font-medium">Phone:</span> {property.practiceLeaderPhone}</p>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Maintenance Requests</h3>
          <p>Total requests: {propertyRequests.length}</p>
        </div>
      </div>
    </PropertyAccessControl>
  );
};

export default PropertyDetail;
