
import React from 'react';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from 'lucide-react';
import Navbar from '@/components/Navbar';

interface RequestDetailNotFoundProps {
  onBackClick: () => void;
}

export const RequestDetailNotFound = ({ onBackClick }: RequestDetailNotFoundProps) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button 
          variant="ghost" 
          className="mb-6"
          onClick={onBackClick}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Requests
        </Button>
        
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-700 mb-2">Request not found</h2>
          <p className="text-gray-500 mb-6">The maintenance request you're looking for doesn't exist or has been removed.</p>
          <Button onClick={onBackClick}>
            View all requests
          </Button>
        </div>
      </main>
    </div>
  );
};
