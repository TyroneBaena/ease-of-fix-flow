import React from 'react';
import Navbar from '@/components/Navbar';
import { DataFetchingTest } from '@/components/testing/DataFetchingTest';

const TestDataFetching = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <DataFetchingTest />
      </main>
    </div>
  );
};

export default TestDataFetching;
