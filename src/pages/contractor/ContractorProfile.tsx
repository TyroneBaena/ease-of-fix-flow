import React, { useState } from 'react';
import { ContractorHeader } from '@/components/contractor/ContractorHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUserContext } from '@/contexts/UnifiedAuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Toaster } from "sonner";
import { useContractorProfileData } from '@/hooks/contractor/useContractorProfileData';
import { EditContractorInfoDialog } from '@/components/contractor/EditContractorInfoDialog';
import { ManageSkillsDialog } from '@/components/contractor/ManageSkillsDialog';
import { ChangePasswordDialog } from '@/components/contractor/ChangePasswordDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Star, User, Building2, Mail, Phone, MapPin, Calendar, Award, Shield, Settings, Key, Smartphone } from 'lucide-react';

const ContractorProfile = () => {
  const { currentUser, loading: userLoading } = useUserContext();
  const { contractor, loading: contractorLoading, error, refetch } = useContractorProfileData();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  const loading = userLoading || contractorLoading;

  // Debug logging for contractor data
  console.log('ContractorProfile - Current contractor data:', contractor);
  console.log('ContractorProfile - Contractor specialties:', contractor?.specialties);
  console.log('ContractorProfile - Loading state:', loading);

  const handleSkillsUpdate = async () => {
    console.log('ContractorProfile - Skills update triggered, refetching data...');
    
    try {
      await refetch();
      console.log('ContractorProfile - Refetch completed successfully');
    } catch (error) {
      console.error('ContractorProfile - Error during refetch:', error);
    }
  };

  if (currentUser && currentUser.role !== 'contractor') {
    return (
      <div className="min-h-screen bg-gray-50">
        <ContractorHeader />
        <main className="container mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertDescription>
              Access denied. This page is only available to contractors.
            </AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ContractorHeader />
        <main className="container mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating) 
            ? 'text-yellow-400 fill-current' 
            : 'text-gray-300'
        }`}
      />
    ));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ContractorHeader />
      <Toaster position="bottom-right" richColors />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600 mt-2">Manage your contractor profile and account settings</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Profile Section */}
          <div className="lg:col-span-2 space-y-8">
            {/* Company & Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Company & Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-6">
                    <Skeleton className="h-6 w-1/3" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="space-y-2">
                          <Skeleton className="h-4 w-1/4" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Company Name
                        </label>
                        <div className="p-3 bg-gray-50 border rounded-md">
                          {contractor?.companyName || 'Not set'}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Contact Name
                        </label>
                        <div className="p-3 bg-gray-50 border rounded-md">
                          {contractor?.contactName || currentUser?.name || 'Not set'}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Email Address
                        </label>
                        <div className="p-3 bg-gray-50 border rounded-md">
                          {contractor?.email || currentUser?.email || 'Not set'}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Phone Number
                        </label>
                        <div className="p-3 bg-gray-50 border rounded-md">
                          {contractor?.phone || 'Not set'}
                        </div>
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Address
                        </label>
                        <div className="p-3 bg-gray-50 border rounded-md">
                          {contractor?.address || 'Not set'}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <EditContractorInfoDialog contractor={contractor} onUpdate={refetch}>
                        <Button className="flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          Edit Information
                        </Button>
                      </EditContractorInfoDialog>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Skills & Services */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Skills & Services
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} className="h-8 w-full" />
                      ))}
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {contractor?.specialties && contractor.specialties.length > 0 ? (
                          contractor.specialties.map((specialty, index) => (
                            <Badge 
                              key={index} 
                              variant="secondary" 
                              className="p-2 text-center justify-center bg-blue-50 text-blue-700 border-blue-200"
                            >
                              {specialty}
                            </Badge>
                          ))
                        ) : (
                          <div className="col-span-full text-center py-8 text-gray-500">
                            <Award className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p className="font-medium">No specialties added yet</p>
                            <p className="text-sm">Add your skills and services to attract more clients</p>
                          </div>
                        )}
                      </div>
                      <div className="flex justify-end">
                        <ManageSkillsDialog 
                          contractor={contractor} 
                          onUpdate={handleSkillsUpdate}
                        >
                          <Button variant="outline" className="flex items-center gap-2">
                            <Settings className="h-4 w-4" />
                            Manage Skills
                          </Button>
                        </ManageSkillsDialog>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Sidebar */}
          <div className="space-y-8">
            {/* Account Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Account Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>Member Since</span>
                      </div>
                      <span className="font-medium">
                        {contractor?.createdAt ? format(new Date(contractor.createdAt), 'MMM d, yyyy') : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Award className="h-4 w-4" />
                        <span>Jobs Completed</span>
                      </div>
                      <Badge variant="outline" className="font-medium">
                        {contractor?.jobsCompleted || 0}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Star className="h-4 w-4" />
                        <span>Rating</span>
                      </div> 
                       <div className="flex items-center gap-2">
                        <div className="flex">
                          {contractor?.rating ? renderStars(contractor.rating) : 'N/A'}
                        </div>
                        {contractor?.rating && (
                          <span className="text-sm font-medium">
                            {contractor.rating.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Shield className="h-4 w-4" />
                        <span>Account Status</span>
                      </div>
                      <Badge 
                        variant={contractor?.accountStatus === 'active' ? 'default' : 'destructive'}
                        className={contractor?.accountStatus === 'active' ? 'bg-green-100 text-green-800' : ''}
                      >
                        {contractor?.accountStatus ? 
                          contractor.accountStatus.charAt(0).toUpperCase() + contractor.accountStatus.slice(1) : 
                          'Unknown'
                        }
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Security Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security & Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-2"
                    onClick={() => setChangePasswordOpen(true)}
                  >
                    <Key className="h-4 w-4" />
                    Change Password
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-2"
                    disabled
                  >
                    <Smartphone className="h-4 w-4" />
                    Two-Factor Authentication
                    <Badge variant="secondary" className="ml-auto text-xs">
                      Coming Soon
                    </Badge>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-2"
                    disabled
                  >
                    <Settings className="h-4 w-4" />
                    Login Devices
                    <Badge variant="secondary" className="ml-auto text-xs">
                      Coming Soon
                    </Badge>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Dialogs */}
        <ChangePasswordDialog 
          open={changePasswordOpen}
          onOpenChange={setChangePasswordOpen}
        />
      </main>
    </div>
  );
};

export default ContractorProfile;
