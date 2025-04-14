
import React from 'react';
import { Card } from "@/components/ui/card";
import { BarChart3 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const ReportsCard = () => {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
        <BarChart3 className="h-5 w-5 mr-2 text-blue-500" />
        Reports
      </h2>
      <p className="text-gray-500 mb-4">
        View detailed reports and analytics on maintenance requests and property management.
      </p>
      <Button asChild>
        <Link to="/reports">View Reports</Link>
      </Button>
    </Card>
  );
};

export default ReportsCard;
