
import React, { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScheduleItem } from '@/hooks/contractor/useContractorSchedule';

interface ScheduleCalendarProps {
  scheduleItems: ScheduleItem[];
  viewMode?: 'day' | 'week' | 'month';
}

export const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({ 
  scheduleItems, 
  viewMode = 'month' 
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Get items for selected date
  const selectedDateString = selectedDate.toISOString().split('T')[0];
  const itemsForSelectedDate = scheduleItems.filter(item => item.date === selectedDateString);

  // Get dates that have scheduled items
  const datesWithItems = scheduleItems.map(item => new Date(item.date));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            modifiers={{
              hasItems: datesWithItems
            }}
            modifiersStyles={{
              hasItems: { backgroundColor: '#dbeafe', color: '#1e40af' }
            }}
            className="rounded-md border"
          />
        </CardContent>
      </Card>

      {itemsForSelectedDate.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Appointments for {selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'short', 
                day: 'numeric' 
              })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {itemsForSelectedDate.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-md">
                  <div>
                    <p className="font-medium">{item.task}</p>
                    <p className="text-sm text-gray-500">{item.time} - {item.location}</p>
                  </div>
                  <Badge variant={item.status === 'scheduled' ? 'default' : 'secondary'}>
                    {item.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
