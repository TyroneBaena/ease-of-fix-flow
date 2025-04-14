
import React from 'react';
import { Card } from "@/components/ui/card";

interface HistoryEvent {
  action: string;
  timestamp: string;
}

interface RequestHistoryProps {
  history?: HistoryEvent[] | null;
}

export const RequestHistory = ({ history = [] }: RequestHistoryProps) => {
  if (!history || history.length === 0) {
    return (
      <Card className="p-6">
        <h2 className="font-semibold mb-4">History</h2>
        <p className="text-gray-500 text-sm">No history available</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="font-semibold mb-4">History</h2>
      <div className="space-y-4">
        {history.map((event, index) => (
          <div key={index} className="flex items-start">
            <div className="h-2 w-2 rounded-full bg-blue-500 mt-2 mr-3"></div>
            <div>
              <p className="text-sm">{event.action}</p>
              <p className="text-xs text-gray-500">{event.timestamp}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
