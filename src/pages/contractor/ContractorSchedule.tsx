
import React, { useState } from 'react';
import { ContractorHeader } from '@/components/contractor/ContractorHeader';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { Toaster } from "sonner";
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useContractorSchedule } from '@/hooks/contractor/useContractorSchedule';
import { UpcomingAppointments } from '@/components/contractor/schedule/UpcomingAppointments';
import { ScheduleCalendar } from '@/components/contractor/schedule/ScheduleCalendar';
import { ScheduleActions } from '@/components/contractor/schedule/ScheduleActions';

const ContractorSchedule = () => {
  const { scheduleItems, loading, error, refreshSchedule } = useContractorSchedule();
  const [viewMode, setViewMode] = useState<'week' | 'month' | 'day'>('month');

  const handleRefresh = () => {
    refreshSchedule();
  };

  const getFilteredScheduleItems = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch (viewMode) {
      case 'day': {
        const todayString = today.toISOString().split('T')[0];
        return scheduleItems.filter(item => item.date === todayString);
      }
      case 'week': {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        
        return scheduleItems.filter(item => {
          const itemDate = new Date(item.date);
          return itemDate >= startOfWeek && itemDate <= endOfWeek;
        });
      }
      case 'month': {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        return scheduleItems.filter(item => {
          const itemDate = new Date(item.date);
          return itemDate >= startOfMonth && itemDate <= endOfMonth;
        });
      }
      default:
        return scheduleItems;
    }
  };

  const filteredScheduleItems = getFilteredScheduleItems();

  const getUpcomingCount = () => {
    const today = new Date();
    const upcoming = scheduleItems.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= today;
    });
    return upcoming.length;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ContractorHeader />
      <Toaster position="bottom-right" richColors />
      <main className="container mx-auto px-4 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Schedule</h1>
            <p className="text-gray-600">
              {loading ? 'Loading...' : `${filteredScheduleItems.length} ${viewMode === 'day' ? 'today' : viewMode === 'week' ? 'this week' : 'this month'}, ${getUpcomingCount()} total upcoming`}
            </p>
          </div>
          <div className="flex gap-2">
            <select 
              className="border rounded-md px-3 py-1.5 text-sm"
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as 'week' | 'month' | 'day')}
            >
              <option value="day">Day View</option>
              <option value="week">Week View</option>
              <option value="month">Month View</option>
            </select>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <Skeleton className="h-96 w-full" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <UpcomingAppointments 
                scheduleItems={filteredScheduleItems}
                viewMode={viewMode}
              />
            </div>
            
            <div className="space-y-6">
              <ScheduleCalendar 
                scheduleItems={viewMode === 'day' ? filteredScheduleItems : scheduleItems}
                viewMode={viewMode}
              />
              <ScheduleActions />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ContractorSchedule;
