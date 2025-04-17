
import React from 'react';
import { Card } from '@/components/ui/card';
import { ContractorStats } from '@/components/contractor/ContractorStats';
import { ContractorRequests } from '@/components/contractor/ContractorRequests';
import { ContractorHeader } from '@/components/contractor/ContractorHeader';

const ContractorDashboard = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <ContractorHeader />
      <main className="container mx-auto px-4 py-8">
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
