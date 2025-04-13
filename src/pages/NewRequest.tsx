
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { RequestForm } from "@/components/request/RequestForm";
import { RequestFormHeader } from "@/components/request/RequestFormHeader";
import Navbar from '@/components/Navbar';

const NewRequest = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <RequestFormHeader />
        
        <Card>
          <CardContent className="pt-6">
            <RequestForm />
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default NewRequest;
