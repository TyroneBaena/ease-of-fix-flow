import React, { useMemo } from 'react';
import Navbar from '@/components/Navbar';
import { Card } from '@/components/ui/card';
import { useContractorContext } from '@/contexts/contractor';
import { ContractorStats } from '@/components/contractor/ContractorStats';
import { ContractorRequests } from '@/components/contractor/ContractorRequests';

const ContractorDashboard = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Contractor Dashboard</h1>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <ContractorStats />
            <ContractorRequests />
          </div>
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="font-semibold mb-4">Quick Actions</h2>
              {/* Quick actions will be added here */}
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ContractorDashboard;
