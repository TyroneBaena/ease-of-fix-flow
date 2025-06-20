
export interface BudgetCategory {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface PropertyBudget {
  id: string;
  property_id: string;
  budget_category_id: string;
  financial_year: number;
  budgeted_amount: number;
  created_at: string;
  updated_at: string;
  budget_category?: BudgetCategory;
}

export interface MaintenanceSpend {
  total_spend: number;
  category_spend: Record<string, number>;
}

export interface BudgetAnalysis {
  category: string;
  budgeted: number;
  spent: number;
  remaining: number;
  percentage_used: number;
  status: 'under' | 'over' | 'on-track';
}
