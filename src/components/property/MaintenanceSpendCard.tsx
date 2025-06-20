
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Calendar } from 'lucide-react';
import { useBudgetData } from '@/hooks/useBudgetData';
import { Skeleton } from '@/components/ui/skeleton';

interface MaintenanceSpendCardProps {
  propertyId: string;
}

export const MaintenanceSpendCard = ({ propertyId }: MaintenanceSpendCardProps) => {
  const { maintenanceSpend, currentFinancialYear, loading, getBudgetAnalysis } = useBudgetData(propertyId);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-32 mb-4" />
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const budgetAnalysis = getBudgetAnalysis();
  const totalBudgeted = budgetAnalysis.reduce((sum, item) => sum + item.budgeted, 0);
  const totalSpent = maintenanceSpend?.total_spend || 0;
  const overBudgetCategories = budgetAnalysis.filter(item => item.status === 'over').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-600" />
          Maintenance Spend
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="h-4 w-4" />
          <span>FY {currentFinancialYear}-{currentFinancialYear + 1}</span>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Total Spent</span>
            <span className="text-xl font-bold text-blue-600">
              ${totalSpent.toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Total Budget</span>
            <span className="text-lg font-semibold">
              ${totalBudgeted.toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between items-center pt-2 border-t">
            <span className="text-sm font-medium">Remaining</span>
            <span className={`text-lg font-bold ${totalBudgeted - totalSpent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${(totalBudgeted - totalSpent).toLocaleString()}
            </span>
          </div>
        </div>

        {overBudgetCategories > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-red-700">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-medium">
                {overBudgetCategories} categor{overBudgetCategories === 1 ? 'y' : 'ies'} over budget
              </span>
            </div>
          </div>
        )}

        {maintenanceSpend?.category_spend && Object.keys(maintenanceSpend.category_spend).length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Spending by Category</h4>
            {Object.entries(maintenanceSpend.category_spend).map(([category, amount]) => (
              <div key={category} className="flex justify-between text-sm">
                <span className="text-gray-600">{category}</span>
                <span className="font-medium">${amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
