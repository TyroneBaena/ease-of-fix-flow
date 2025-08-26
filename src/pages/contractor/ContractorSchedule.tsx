
import React, { useState } from 'react';
import { ContractorHeader } from '@/components/contractor/ContractorHeader';
import { Button } from '@/components/ui/button';
import { RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
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
  // Initialize with current date/September 2025 to show September appointments
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const now = new Date();
    // For demo purposes, if we're looking for September appointments, set to September
    if (now.getFullYear() === 2025 && now.getMonth() < 8) { // If before September
      return new Date(2025, 8, 1); // September 1, 2025
    }
    return now;
  });

  const handleRefresh = () => {
    refreshSchedule();
  };

  const getFilteredScheduleItems = () => {
    const baseDate = new Date(selectedDate);
    baseDate.setHours(0, 0, 0, 0);
    
    switch (viewMode) {
      case 'day': {
        const selectedDateString = baseDate.toISOString().split('T')[0];
        return scheduleItems.filter(item => item.date === selectedDateString);
      }
      case 'week': {
        const startOfWeek = new Date(baseDate);
        startOfWeek.setDate(baseDate.getDate() - baseDate.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        
        return scheduleItems.filter(item => {
          const itemDate = new Date(item.date);
          return itemDate >= startOfWeek && itemDate <= endOfWeek;
        });
      }
      case 'month': {
        const startOfMonth = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
        const endOfMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
        
        return scheduleItems.filter(item => {
          // Parse date as YYYY-MM-DD and compare with same timezone
          const itemDate = new Date(item.date + 'T00:00:00');
          const startCompare = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth(), startOfMonth.getDate());
          const endCompare = new Date(endOfMonth.getFullYear(), endOfMonth.getMonth(), endOfMonth.getDate());
          
          return itemDate >= startCompare && itemDate <= endCompare;
        });
      }
      default:
        return scheduleItems;
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    
    switch (viewMode) {
      case 'day':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
    }
    
    setSelectedDate(newDate);
  };

  const getCurrentPeriodLabel = () => {
    switch (viewMode) {
      case 'day':
        return selectedDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'long', 
          day: 'numeric',
          year: 'numeric'
        });
      case 'week': {
        const startOfWeek = new Date(selectedDate);
        startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        
        return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      }
      case 'month':
        return selectedDate.toLocaleDateString('en-US', { 
          month: 'long', 
          year: 'numeric'
        });
      default:
        return '';
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
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateDate('prev')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-lg font-medium min-w-[200px] text-center">
                  {getCurrentPeriodLabel()}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateDate('next')}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDate(new Date())}
                className="text-sm"
              >
                Today
              </Button>
            </div>
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
                scheduleItems={scheduleItems}
                viewMode={viewMode}
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
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
