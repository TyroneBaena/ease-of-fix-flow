
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { BudgetCategory, PropertyBudget, MaintenanceSpend, BudgetAnalysis } from '@/types/budget';
import { toast } from '@/lib/toast';

export const useBudgetData = (propertyId: string) => {
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);
  const [propertyBudgets, setPropertyBudgets] = useState<PropertyBudget[]>([]);
  const [maintenanceSpend, setMaintenanceSpend] = useState<MaintenanceSpend | null>(null);
  const [currentFinancialYear, setCurrentFinancialYear] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBudgetData();
  }, [propertyId]);

  const fetchBudgetData = async () => {
    try {
      setLoading(true);
      
      // Fetch current financial year
      const { data: fyData, error: fyError } = await supabase
        .rpc('get_current_financial_year');
      
      if (fyError) throw fyError;
      setCurrentFinancialYear(fyData);

      // Fetch budget categories
      const { data: categories, error: categoriesError } = await supabase
        .from('budget_categories')
        .select('*')
        .order('name');

      if (categoriesError) throw categoriesError;
      setBudgetCategories(categories);

      // Fetch property budgets for current financial year
      const { data: budgets, error: budgetsError } = await supabase
        .from('property_budgets')
        .select(`
          *,
          budget_category:budget_categories(*)
        `)
        .eq('property_id', propertyId)
        .eq('financial_year', fyData);

      if (budgetsError) throw budgetsError;
      setPropertyBudgets(budgets);

      // Fetch maintenance spend
      const { data: spendData, error: spendError } = await supabase
        .rpc('get_property_maintenance_spend', {
          p_property_id: propertyId,
          p_financial_year: fyData
        });

      if (spendError) throw spendError;
      setMaintenanceSpend(spendData[0] || { total_spend: 0, category_spend: {} });

    } catch (error) {
      console.error('Error fetching budget data:', error);
      toast.error('Failed to load budget data');
    } finally {
      setLoading(false);
    }
  };

  const updateBudget = async (categoryId: string, amount: number) => {
    try {
      const existingBudget = propertyBudgets.find(b => b.budget_category_id === categoryId);

      if (existingBudget) {
        const { error } = await supabase
          .from('property_budgets')
          .update({ budgeted_amount: amount })
          .eq('id', existingBudget.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('property_budgets')
          .insert({
            property_id: propertyId,
            budget_category_id: categoryId,
            financial_year: currentFinancialYear,
            budgeted_amount: amount
          });

        if (error) throw error;
      }

      await fetchBudgetData();
      toast.success('Budget updated successfully');
    } catch (error) {
      console.error('Error updating budget:', error);
      toast.error('Failed to update budget');
    }
  };

  const getBudgetAnalysis = (): BudgetAnalysis[] => {
    if (!maintenanceSpend) return [];

    return budgetCategories.map(category => {
      const budget = propertyBudgets.find(b => b.budget_category_id === category.id);
      const budgeted = budget?.budgeted_amount || 0;
      const spent = maintenanceSpend.category_spend[category.name] || 0;
      const remaining = budgeted - spent;
      const percentage_used = budgeted > 0 ? (spent / budgeted) * 100 : 0;

      let status: 'under' | 'over' | 'on-track' = 'on-track';
      if (percentage_used > 100) {
        status = 'over';
      } else if (percentage_used < 80) {
        status = 'under';
      }

      return {
        category: category.name,
        budgeted,
        spent,
        remaining,
        percentage_used,
        status
      };
    });
  };

  return {
    budgetCategories,
    propertyBudgets,
    maintenanceSpend,
    currentFinancialYear,
    loading,
    updateBudget,
    getBudgetAnalysis,
    refreshData: fetchBudgetData
  };
};
