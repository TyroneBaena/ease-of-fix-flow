import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { usePropertyContext } from '@/contexts/property';
import { useMaintenanceRequestContext } from '@/contexts/maintenance';
import { Property } from '@/types/property';
import PropertyAccessControl from './PropertyAccessControl';
import { landlordsService, Landlord } from '@/services/landlordsService';

interface PropertyDetailProps {
  property: Property;
}

const PropertyDetail: React.FC<PropertyDetailProps> = ({ property }) => {
  const { getRequestsForProperty } = useMaintenanceRequestContext();
  const [isLoaded, setIsLoaded] = useState(false);
  const propertyRequests = getRequestsForProperty(property.id);
  const [landlord, setLandlord] = useState<Landlord | null>(null);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);
    return () => clearTimeout(timer);
  }, [property.id]);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      if (!property.landlordId) { setLandlord(null); return; }
      try {
        const l = await landlordsService.getById(property.landlordId);
        if (!ignore) setLandlord(l);
      } catch (e) {
        console.error('Failed to load landlord', e);
      }
    };
    load();
    return () => { ignore = true; };
  }, [property.landlordId]);

  if (!isLoaded) {
    return (
      <PropertyAccessControl propertyId={property.id}>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="animate-pulse">
            <div className="h-7 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="h-5 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
              <div>
                <div className="h-5 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PropertyAccessControl>
    );
  }

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
            <h3 className="text-lg font-semibold mb-2">Landlord</h3>
            {landlord ? (
              <div className="space-y-1">
                <p><span className="font-medium">Name:</span> {landlord.name}</p>
                <p><span className="font-medium">Email:</span> {landlord.email}</p>
                <p><span className="font-medium">Phone:</span> {landlord.phone || 'Not provided'}</p>
                {landlord.office_address && (<p><span className="font-medium">Office:</span> {landlord.office_address}</p>)}
                {landlord.postal_address && (<p><span className="font-medium">Postal:</span> {landlord.postal_address}</p>)}
              </div>
            ) : (
              <p className="text-gray-600">No landlord linked</p>
            )}
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
