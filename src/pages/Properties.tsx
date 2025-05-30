import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePropertyContext } from '@/contexts/property/PropertyContext';
import Navbar from '@/components/Navbar';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building, Plus, MapPin, Phone, Mail, Calendar, DollarSign } from 'lucide-react';
import { toast } from '@/lib/toast';
import { PropertyForm } from '@/components/property/PropertyForm';

const Properties = () => {
  const { properties } = usePropertyContext();
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleClose = () => {
    setDialogOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Properties</h1>
            <p className="text-gray-600 mt-1">Manage all your properties in one place</p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center">
                <Plus className="mr-2 h-4 w-4" />
                Add Property
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Add New Property</DialogTitle>
                <DialogDescription>
                  Enter the details for the new property. All fields are required.
                </DialogDescription>
              </DialogHeader>
              <PropertyForm onClose={handleClose} />
            </DialogContent>
          </Dialog>
        </div>
        
        {properties.length === 0 ? (
          <div className="text-center py-12">
            <Building className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">No properties yet</h3>
            <p className="mt-1 text-gray-500">Get started by adding your first property.</p>
            <div className="mt-6">
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Property
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property) => (
              <Link to={`/properties/${property.id}`} key={property.id}>
                <Card className="h-full hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle>{property.name}</CardTitle>
                    <CardDescription className="flex items-center text-gray-600">
                      <MapPin className="h-4 w-4 mr-1" />
                      {property.address}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-2 text-gray-500" />
                        <span>{property.contactNumber}</span>
                      </div>
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 mr-2 text-gray-500" />
                        <span>{property.email}</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                        <span>Renewal: {new Date(property.renewalDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-2 text-gray-500" />
                        <span>{property.rentAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t pt-4">
                    <Button variant="outline" className="w-full">View Details</Button>
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Properties;
