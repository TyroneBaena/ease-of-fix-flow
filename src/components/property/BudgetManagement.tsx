
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { DollarSign, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useBudgetData } from '@/hooks/useBudgetData';
import { Skeleton } from '@/components/ui/skeleton';

interface BudgetManagementProps {
  propertyId: string;
}

export const BudgetManagement = ({ propertyId }: BudgetManagementProps) => {
  const { 
    budgetCategories, 
    maintenanceSpend, 
    currentFinancialYear, 
    loading, 
    updateBudget,
    getBudgetAnalysis 
  } = useBudgetData(propertyId);

  const [editingBudgets, setEditingBudgets] = useState<Record<string, number>>({});

  const budgetAnalysis = getBudgetAnalysis();
  const totalBudgeted = budgetAnalysis.reduce((sum, item) => sum + item.budgeted, 0);
  const totalSpent = maintenanceSpend?.total_spend || 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const handleBudgetUpdate = async (categoryId: string) => {
    const amount = editingBudgets[categoryId];
    if (amount !== undefined) {
      await updateBudget(categoryId, amount);
      setEditingBudgets(prev => {
        const newState = { ...prev };
        delete newState[categoryId];
        return newState;
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'over':
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'under':
        return <TrendingDown className="h-4 w-4 text-green-500" />;
      default:
        return <Minus className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'over':
        return 'text-red-600 bg-red-50';
      case 'under':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-blue-600 bg-blue-50';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Budget Management</h2>
          <p className="text-gray-600">Financial Year {currentFinancialYear}-{currentFinancialYear + 1}</p>
        </div>
      </div>

      {/* Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Budget Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-gray-600">Total Budgeted</p>
              <p className="text-2xl font-bold text-blue-600">
                ${totalBudgeted.toLocaleString()}
              </p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-gray-600">Total Spent</p>
              <p className="text-2xl font-bold text-orange-600">
                ${totalSpent.toLocaleString()}
              </p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-gray-600">Remaining</p>
              <p className={`text-2xl font-bold ${totalBudgeted - totalSpent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${(totalBudgeted - totalSpent).toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Budgets */}
      <div className="grid gap-4">
        {budgetCategories.map(category => {
          const analysis = budgetAnalysis.find(a => a.category === category.name);
          const isEditing = editingBudgets.hasOwnProperty(category.id);
          
          return (
            <Card key={category.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(analysis?.status || 'on-track')}
                    <span>{category.name}</span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(analysis?.status || 'on-track')}`}>
                    {analysis?.percentage_used.toFixed(1)}% used
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">{category.description}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor={`budget-${category.id}`}>Budget Amount</Label>
                    <div className="flex gap-2">
                      <Input
                        id={`budget-${category.id}`}
                        type="number"
                        value={isEditing ? editingBudgets[category.id] : analysis?.budgeted || 0}
                        onChange={(e) => setEditingBudgets(prev => ({
                          ...prev,
                          [category.id]: parseFloat(e.target.value) || 0
                        }))}
                        placeholder="Enter budget"
                      />
                      {isEditing ? (
                        <Button 
                          onClick={() => handleBudgetUpdate(category.id)}
                          size="sm"
                        >
                          Save
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  
                  <div>
                    <Label>Spent</Label>
                    <p className="text-lg font-semibold">${analysis?.spent.toLocaleString() || 0}</p>
                  </div>
                  
                  <div>
                    <Label>Remaining</Label>
                    <p className={`text-lg font-semibold ${(analysis?.remaining || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${analysis?.remaining.toLocaleString() || 0}
                    </p>
                  </div>
                </div>

                {analysis && analysis.budgeted > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{analysis.percentage_used.toFixed(1)}%</span>
                    </div>
                    <Progress 
                      value={Math.min(analysis.percentage_used, 100)} 
                      className="h-2"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
