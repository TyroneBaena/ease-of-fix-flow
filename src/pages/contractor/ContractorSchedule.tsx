
import React from 'react';
import { ContractorHeader } from '@/components/contractor/ContractorHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Toaster } from "sonner";

const ContractorSchedule = () => {
  // Sample schedule data
  const scheduleItems = [
    { date: '2025-05-15', time: '09:00 AM', task: 'Plumbing repair at 123 Main St', status: 'scheduled' },
    { date: '2025-05-16', time: '11:30 AM', task: 'HVAC inspection at 456 Oak Ave', status: 'scheduled' },
    { date: '2025-05-18', time: '02:00 PM', task: 'Electrical issue at 789 Pine Rd', status: 'tentative' },
    { date: '2025-05-20', time: '10:00 AM', task: 'Kitchen renovation planning at 321 Elm St', status: 'scheduled' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <ContractorHeader />
      <Toaster position="bottom-right" richColors />
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Schedule</h1>
          <div className="flex gap-2">
            <select className="border rounded-md px-3 py-1.5 text-sm">
              <option>Week View</option>
              <option>Month View</option>
              <option>Day View</option>
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Appointments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {scheduleItems.map((item, index) => (
                    <div key={index} className="border rounded-md p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{item.task}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(item.date).toLocaleDateString('en-US', { 
                              weekday: 'long', 
                              month: 'short', 
                              day: 'numeric' 
                            })} at {item.time}
                          </p>
                        </div>
                        <div>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            item.status === 'scheduled' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {item.status === 'scheduled' ? 'Confirmed' : 'Tentative'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Calendar</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center p-4 border rounded-md bg-gray-50">
                  <p>Calendar widget placeholder</p>
                  <p className="text-sm text-gray-500 mt-2">
                    May 2025
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <button className="w-full text-left px-4 py-2 border rounded-md hover:bg-gray-50 transition-colors">
                    Block Time Off
                  </button>
                  <button className="w-full text-left px-4 py-2 border rounded-md hover:bg-gray-50 transition-colors">
                    Set Availability
                  </button>
                  <button className="w-full text-left px-4 py-2 border rounded-md hover:bg-gray-50 transition-colors">
                    Export Schedule
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ContractorSchedule;
