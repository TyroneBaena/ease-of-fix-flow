
import React from 'react';
import { ContractorHeader } from '@/components/contractor/ContractorHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUserContext } from '@/contexts/UserContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Toaster } from "sonner";
import { useContractorProfileData } from '@/hooks/contractor/useContractorProfileData';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';

const ContractorProfile = () => {
  const { currentUser, loading: userLoading } = useUserContext();
  const { contractor, loading: contractorLoading, error } = useContractorProfileData();

  const loading = userLoading || contractorLoading;

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

  return (
    <div className="min-h-screen bg-gray-50">
      <ContractorHeader />
      <Toaster position="bottom-right" richColors />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">My Profile</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-6 w-1/3" />
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-6 w-2/3" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Company Name</label>
                        <div className="mt-1 p-2 border rounded-md">
                          {contractor?.companyName || 'Not set'}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Contact Name</label>
                        <div className="mt-1 p-2 border rounded-md">
                          {contractor?.contactName || currentUser?.name || 'Not set'}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Email Address</label>
                        <div className="mt-1 p-2 border rounded-md">
                          {contractor?.email || currentUser?.email || 'Not set'}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Phone Number</label>
                        <div className="mt-1 p-2 border rounded-md">
                          {contractor?.phone || 'Not set'}
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium text-gray-500">Address</label>
                        <div className="mt-1 p-2 border rounded-md">
                          {contractor?.address || 'Not set'}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button>Edit Information</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Skills & Services</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} className="h-8 w-full" />
                      ))}
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {contractor?.specialties && contractor.specialties.length > 0 ? (
                          contractor.specialties.map((specialty) => (
                            <div key={specialty} className="bg-gray-100 p-2 rounded-md text-sm text-center">
                              {specialty}
                            </div>
                          ))
                        ) : (
                          <div className="col-span-full text-gray-500 text-center py-4">
                            No specialties added yet
                          </div>
                        )}
                      </div>
                      <div className="flex justify-end">
                        <Button variant="outline">Manage Skills</Button>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Account Summary</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Member Since</span>
                      <span className="font-medium">
                        {contractor?.createdAt ? format(new Date(contractor.createdAt), 'MMMM d, yyyy') : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Jobs Completed</span>
                      <span className="font-medium">{contractor?.jobsCompleted || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Rating</span>
                      <span className="font-medium">{contractor?.rating || 'N/A'}/5.0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Account Status</span>
                      <span className={`font-medium ${contractor?.accountStatus === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                        {contractor?.accountStatus ? contractor.accountStatus.charAt(0).toUpperCase() + contractor.accountStatus.slice(1) : 'Unknown'}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Security</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button variant="outline" className="w-full justify-start">
                    Change Password
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    Two-Factor Authentication
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    Login Devices
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ContractorProfile;
