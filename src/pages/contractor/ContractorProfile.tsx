
import React from 'react';
import { ContractorHeader } from '@/components/contractor/ContractorHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUserContext } from '@/contexts/UserContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Toaster } from "sonner";

const ContractorProfile = () => {
  const { currentUser, loading } = useUserContext();

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
                        <label className="text-sm font-medium text-gray-500">Full Name</label>
                        <div className="mt-1 p-2 border rounded-md">
                          {currentUser?.name || 'Not set'}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Email Address</label>
                        <div className="mt-1 p-2 border rounded-md">
                          {currentUser?.email || 'Not set'}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Phone Number</label>
                        <div className="mt-1 p-2 border rounded-md">
                          (555) 123-4567
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Address</label>
                        <div className="mt-1 p-2 border rounded-md">
                          123 Contractor Ave, Service City, SV 12345
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
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {['Plumbing', 'Electrical', 'HVAC', 'Carpentry', 'Painting', 'Flooring', 'Roofing', 'General Repairs'].map((skill) => (
                      <div key={skill} className="bg-gray-100 p-2 rounded-md text-sm text-center">
                        {skill}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end">
                    <Button variant="outline">Manage Skills</Button>
                  </div>
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
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Member Since</span>
                    <span className="font-medium">January 15, 2025</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Jobs Completed</span>
                    <span className="font-medium">24</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Rating</span>
                    <span className="font-medium">4.8/5.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Account Status</span>
                    <span className="text-green-600 font-medium">Active</span>
                  </div>
                </div>
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
