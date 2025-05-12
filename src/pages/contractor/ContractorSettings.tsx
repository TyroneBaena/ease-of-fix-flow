
import React from 'react';
import { ContractorHeader } from '@/components/contractor/ContractorHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Toaster } from "sonner";
import { Label } from '@/components/ui/label';

const ContractorSettings = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <ContractorHeader />
      <Toaster position="bottom-right" richColors />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="new-job-email">Email notifications for new jobs</Label>
                      <p className="text-sm text-gray-500">Receive an email when new job opportunities are available</p>
                    </div>
                    <Switch id="new-job-email" defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="job-updates-email">Email notifications for job updates</Label>
                      <p className="text-sm text-gray-500">Receive an email when there are updates to your jobs</p>
                    </div>
                    <Switch id="job-updates-email" defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="sms-notifications">SMS notifications</Label>
                      <p className="text-sm text-gray-500">Receive text messages for important updates</p>
                    </div>
                    <Switch id="sms-notifications" />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="app-notifications">In-app notifications</Label>
                      <p className="text-sm text-gray-500">See notifications within the application</p>
                    </div>
                    <Switch id="app-notifications" defaultChecked />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Availability</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="active-status">Active Status</Label>
                      <p className="text-sm text-gray-500">Make your profile visible to receive new job offers</p>
                    </div>
                    <Switch id="active-status" defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="weekend-availability">Weekend Availability</Label>
                      <p className="text-sm text-gray-500">Show that you're available for weekend work</p>
                    </div>
                    <Switch id="weekend-availability" />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="emergency-availability">Emergency Availability</Label>
                      <p className="text-sm text-gray-500">Show that you're available for emergency calls</p>
                    </div>
                    <Switch id="emergency-availability" defaultChecked />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="dark-mode">Dark Mode</Label>
                      <p className="text-sm text-gray-500">Use dark theme for the application</p>
                    </div>
                    <Switch id="dark-mode" />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="auto-refresh">Auto Refresh</Label>
                      <p className="text-sm text-gray-500">Automatically refresh job listings</p>
                    </div>
                    <Switch id="auto-refresh" defaultChecked />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Privacy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="data-sharing">Data Sharing</Label>
                      <p className="text-sm text-gray-500">Allow sharing your information with partners</p>
                    </div>
                    <Switch id="data-sharing" />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="analytics">Usage Analytics</Label>
                      <p className="text-sm text-gray-500">Allow anonymous usage data collection</p>
                    </div>
                    <Switch id="analytics" defaultChecked />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ContractorSettings;
