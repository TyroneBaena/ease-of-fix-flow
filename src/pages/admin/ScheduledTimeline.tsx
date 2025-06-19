
import React from 'react';
import Navbar from '@/components/Navbar';
import { ScheduledTimelineView } from '@/components/admin/ScheduledTimelineView';
import { Toaster } from "sonner";

const ScheduledTimeline = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Scheduled Jobs Timeline</h1>
          <p className="text-gray-600 mt-2">
            View all scheduled jobs across contractors and manage timelines
          </p>
        </div>
        
        <ScheduledTimelineView />
      </main>
      <Toaster position="top-right" />
    </div>
  );
};

export default ScheduledTimeline;
