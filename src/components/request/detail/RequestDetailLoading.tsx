
import React from 'react';
import Navbar from '@/components/Navbar';

export const RequestDetailLoading = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center items-center h-64">
          <p>Loading request...</p>
        </div>
      </main>
    </div>
  );
};
