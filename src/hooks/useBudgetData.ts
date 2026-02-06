import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { BudgetCategory, PropertyBudget, MaintenanceSpend, BudgetAnalysis } from "@/types/budget";
import { toast } from "@/lib/toast";
import { useUnifiedAuth, waitForSessionReady } from "@/contexts/UnifiedAuthContext";

export const useBudgetData = (propertyId: string) => {
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);
  const [propertyBudgets, setPropertyBudgets] = useState<PropertyBudget[]>([]);
  const [maintenanceSpend, setMaintenanceSpend] = useState<MaintenanceSpend | null>(null);
  const [currentFinancialYear, setCurrentFinancialYear] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const { sessionVersion } = useUnifiedAuth(); // v97.1: Use sessionVersion for proper coordination

  useEffect(() => {
    if (propertyId) {
      fetchBudgetData();
    } else {
      setLoading(false);
    }
  }, [propertyId, sessionVersion]); // v97.1: Use sessionVersion for proper coordination

  const fetchBudgetData = async () => {
    // v97.1: CRITICAL - Wait for specific session version to be ready
    console.log(`⏳ v97.1 - useBudgetData: Waiting for session version ${sessionVersion} to be ready...`);
    const isReady = await waitForSessionReady(sessionVersion, 10000);

    if (!isReady) {
      console.warn("⚠️ v97.1 - useBudgetData: Session not ready after timeout");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      console.log(`✅ v97.1 - useBudgetData: Session version ${sessionVersion} ready, fetching budget data`);

      // Fetch current financial year first since other queries depend on it
      const { data: fyData, error: fyError } = await supabase.rpc("get_current_financial_year");

      if (fyError) throw fyError;
      setCurrentFinancialYear(fyData);

      // Now fetch the remaining data in parallel
      const [categoriesResult, budgetsResult, spendResult] = await Promise.all([
        // Fetch budget categories
        supabase.from("budget_categories").select("*").order("name"),

        // Fetch property budgets for current financial year
        supabase
          .from("property_budgets")
          .select(
            `
            *,
            budget_category:budget_categories(*)
          `,
          )
          .eq("property_id", propertyId)
          .eq("financial_year", fyData),

        // Fetch maintenance spend
        supabase.rpc("get_property_maintenance_spend", {
          p_property_id: propertyId,
          p_financial_year: fyData,
        }),
      ]);

      if (categoriesResult.error) throw categoriesResult.error;
      if (budgetsResult.error) throw budgetsResult.error;
      if (spendResult.error) throw spendResult.error;

      setBudgetCategories(categoriesResult.data);
      setPropertyBudgets(budgetsResult.data);

      // Type the response properly and handle the Json to Record conversion
      const rawSpendData = spendResult.data?.[0];
      if (rawSpendData) {
        const categorySpend = rawSpendData.category_spend as Record<string, unknown>;
        // Convert the category_spend values to numbers
        const typedCategorySpend: Record<string, number> = {};
        if (categorySpend && typeof categorySpend === "object") {
          Object.entries(categorySpend).forEach(([key, value]) => {
            typedCategorySpend[key] = typeof value === "number" ? value : 0;
          });
        }

        setMaintenanceSpend({
          total_spend: Number(rawSpendData.total_spend) || 0,
          category_spend: typedCategorySpend,
        });
      } else {
        setMaintenanceSpend({ total_spend: 0, category_spend: {} });
      }
    } catch (error) {
      console.error("Error fetching budget data:", error);
      toast.error("Failed to load budget data");
    } finally {
      setLoading(false);
    }
  };

  const updateBudget = async (categoryId: string, amount: number) => {
    try {
      const existingBudget = propertyBudgets.find((b) => b.budget_category_id === categoryId);

      if (existingBudget) {
        const { error } = await supabase
          .from("property_budgets")
          .update({ budgeted_amount: amount })
          .eq("id", existingBudget.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("property_budgets").insert({
          property_id: propertyId,
          budget_category_id: categoryId,
          financial_year: currentFinancialYear,
          budgeted_amount: amount,
        });

        if (error) throw error;
      }

      await fetchBudgetData();
      toast.success("Budget updated successfully");
    } catch (error) {
      console.error("Error updating budget:", error);
      toast.error("Failed to update budget");
    }
  };

  const getBudgetAnalysis = (): BudgetAnalysis[] => {
    if (!maintenanceSpend) return [];

    return budgetCategories.map((category) => {
      const budget = propertyBudgets.find((b) => b.budget_category_id === category.id);
      const budgeted = budget?.budgeted_amount || 0;
      const spent = maintenanceSpend.category_spend[category.name] || 0;
      const remaining = budgeted - spent;
      const percentage_used = budgeted > 0 ? (spent / budgeted) * 100 : 0;

      let status: "under" | "over" | "on-track" = "on-track";
      if (percentage_used > 100) {
        status = "over";
      } else if (percentage_used < 80) {
        status = "under";
      }

      return {
        category: category.name,
        budgeted,
        spent,
        remaining,
        percentage_used,
        status,
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
    refreshData: fetchBudgetData,
  };
};
