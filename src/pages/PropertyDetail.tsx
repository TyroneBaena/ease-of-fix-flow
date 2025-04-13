
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { usePropertyContext } from '@/contexts/PropertyContext';
import Navbar from '@/components/Navbar';
import { QRCodeSVG } from 'qrcode.react';
import { generateQRCodeUrl } from '@/utils/qrCodeGenerator';
import { toast } from '@/lib/toast';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  MapPin,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  User,
  Edit,
  Trash,
  QrCode,
  ClipboardList,
  Download
} from 'lucide-react';
import { PropertyForm } from '@/components/property/PropertyForm';

const PropertyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getProperty, getRequestsForProperty, deleteProperty } = usePropertyContext();
  const [property, setProperty] = useState(id ? getProperty(id) : undefined);
  const [requests, setRequests] = useState(id ? getRequestsForProperty(id) : []);
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
    // This is a placeholder for actual QR code download functionality
    toast.success('QR Code downloaded');
  };

  if (!property) {
    return <div>Loading...</div>;
  }

  const qrCodeUrl = id ? generateQRCodeUrl(id) : '';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              onClick={() => setQrDialogOpen(true)}
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
            
            <Button
              variant="destructive"
              onClick={handleDeleteProperty}
              className="flex items-center"
            >
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Property Information</CardTitle>
                <CardDescription>Detailed information about the property</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Contact Information</h3>
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 mr-2 text-gray-500" />
                          <span>{property.contactNumber}</span>
                        </div>
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-2 text-gray-500" />
                          <span>{property.email}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Practice Leader</h3>
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-2 text-gray-500" />
                          <span>{property.practiceLeader}</span>
                        </div>
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-2 text-gray-500" />
                          <span>{property.practiceLeaderEmail || 'Not provided'}</span>
                        </div>
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 mr-2 text-gray-500" />
                          <span>{property.practiceLeaderPhone || 'Not provided'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Rental Information</h3>
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                          <span>
                            Renewal Date: {property.renewalDate ? new Date(property.renewalDate).toLocaleDateString() : 'Not specified'}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 mr-2 text-gray-500" />
                          <span>
                            Rent Amount: {property.rentAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">QR Code</h3>
                      <div className="mt-2">
                        <p className="text-sm text-gray-600 mb-2">
                          Scan this QR code to create a maintenance request for this property.
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => setQrDialogOpen(true)}
                          className="flex items-center"
                        >
                          <QrCode className="mr-2 h-4 w-4" />
                          View QR Code
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ClipboardList className="h-5 w-5 mr-2" />
                  Maintenance Requests
                </CardTitle>
                <CardDescription>
                  All maintenance requests for this property
                </CardDescription>
              </CardHeader>
              <CardContent>
                {requests.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No maintenance requests for this property yet.</p>
                    <Button
                      className="mt-4"
                      onClick={() => navigate(`/new-request?propertyId=${id}`)}
                    >
                      Create Maintenance Request
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell className="font-medium">{request.title}</TableCell>
                          <TableCell>{request.category}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              request.priority === 'high' ? 'bg-red-100 text-red-800' : 
                              request.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-green-100 text-green-800'
                            }`}>
                              {request.priority}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              request.status === 'completed' ? 'bg-green-100 text-green-800' : 
                              request.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {request.status}
                            </span>
                          </TableCell>
                          <TableCell>{new Date(request.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/requests/${request.id}`)}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  className="w-full justify-start"
                  onClick={() => navigate(`/new-request?propertyId=${id}`)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Maintenance Request
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setQrDialogOpen(true)}
                >
                  <QrCode className="mr-2 h-4 w-4" />
                  View QR Code
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setDialogOpen(true)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Property Details
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Property QR Code</DialogTitle>
            <DialogDescription>
              Scan this code to create a maintenance request for {property.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-6">
            <div className="border p-4 rounded-lg">
              <QRCodeSVG value={qrCodeUrl} size={200} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setQrDialogOpen(false)}>
              Close
            </Button>
            <Button type="button" onClick={handleQrDownload} className="flex items-center">
              <Download className="mr-2 h-4 w-4" />
              Download QR Code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PropertyDetail;
