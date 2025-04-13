
import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from 'lucide-react';

const UpcomingMaintenanceCard = () => {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
        <Calendar className="h-5 w-5 mr-2 text-blue-500" />
        Upcoming Maintenance
      </h2>
      <div className="space-y-2">
        <div className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer">
          <div className="flex justify-between items-start mb-1">
            <h3 className="font-medium">HVAC Inspection</h3>
            <Badge variant="outline" className="text-xs">Today</Badge>
          </div>
          <p className="text-sm text-gray-500">Main Building, Floor 3</p>
        </div>
        <div className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer">
          <div className="flex justify-between items-start mb-1">
            <h3 className="font-medium">Elevator Service</h3>
            <Badge variant="outline" className="text-xs">Tomorrow</Badge>
          </div>
          <p className="text-sm text-gray-500">North Tower</p>
        </div>
      </div>
      <Button variant="ghost" className="w-full mt-4 text-blue-500">
        View Schedule
      </Button>
    </Card>
  );
};

export default UpcomingMaintenanceCard;
