
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, AlertCircle } from 'lucide-react';
import { ScheduleItem } from '@/hooks/contractor/useContractorSchedule';
import { useNavigate } from 'react-router-dom';

interface UpcomingAppointmentsProps {
  scheduleItems: ScheduleItem[];
}

export const UpcomingAppointments: React.FC<UpcomingAppointmentsProps> = ({ scheduleItems }) => {
  const navigate = useNavigate();

  // Sort by date and time, show next 10 items
  const upcomingItems = scheduleItems
    .sort((a, b) => {
      const dateTimeA = new Date(`${a.date}T${a.time}`);
      const dateTimeB = new Date(`${b.date}T${b.time}`);
      return dateTimeA.getTime() - dateTimeB.getTime();
    })
    .slice(0, 10);

  const handleItemClick = (item: ScheduleItem) => {
    navigate(`/contractor-jobs/${item.requestId}`);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Appointments</CardTitle>
      </CardHeader>
      <CardContent>
        {upcomingItems.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No upcoming appointments scheduled</p>
          </div>
        ) : (
          <div className="space-y-4">
            {upcomingItems.map((item) => (
              <div 
                key={item.id} 
                className="border rounded-md p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => handleItemClick(item)}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-sm">{item.task}</h4>
                  <div className="flex gap-2">
                    <Badge 
                      variant={item.status === 'scheduled' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {item.status}
                    </Badge>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getPriorityColor(item.priority)}`}
                    >
                      {item.priority}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>
                      {new Date(item.date).toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      })} at {item.time}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>{item.location}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
