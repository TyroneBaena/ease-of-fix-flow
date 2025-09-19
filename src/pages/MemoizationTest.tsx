import React from 'react';
import { MemoizationTestPanel } from '@/components/testing/MemoizationTestPanel';

const MemoizationTest: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <MemoizationTestPanel />
      </div>
    </div>
  );
};

export default MemoizationTest;