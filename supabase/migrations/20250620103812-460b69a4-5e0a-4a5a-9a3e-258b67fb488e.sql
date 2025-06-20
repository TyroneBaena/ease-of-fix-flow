
-- Create budget_categories table
CREATE TABLE public.budget_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default budget categories
INSERT INTO public.budget_categories (name, description) VALUES
  ('Assets', 'Major equipment and asset purchases'),
  ('Uplift', 'Property improvements and upgrades'),
  ('Repairs', 'General maintenance and repair work');

-- Create property_budgets table
CREATE TABLE public.property_budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  budget_category_id UUID NOT NULL REFERENCES public.budget_categories(id) ON DELETE CASCADE,
  financial_year INTEGER NOT NULL,
  budgeted_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(property_id, budget_category_id, financial_year)
);

-- Add budget_category_id to maintenance_requests to track which category each request belongs to
ALTER TABLE public.maintenance_requests 
ADD COLUMN budget_category_id UUID REFERENCES public.budget_categories(id);

-- Enable RLS on new tables
ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_budgets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for budget_categories (read-only for all authenticated users)
CREATE POLICY "Users can view budget categories"
  ON public.budget_categories
  FOR SELECT
  TO authenticated
  USING (true);

-- Create RLS policies for property_budgets
CREATE POLICY "Users can view property budgets for their properties"
  ON public.property_budgets
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties 
      WHERE id = property_id AND user_id = auth.uid()
    )
    OR public.get_current_user_role() = 'admin'
  );

CREATE POLICY "Users can manage property budgets for their properties"
  ON public.property_budgets
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties 
      WHERE id = property_id AND user_id = auth.uid()
    )
    OR public.get_current_user_role() = 'admin'
  );

-- Create function to get current financial year (July 1 - June 30)
CREATE OR REPLACE FUNCTION public.get_current_financial_year()
RETURNS INTEGER
LANGUAGE SQL
STABLE
AS $$
  SELECT CASE 
    WHEN EXTRACT(MONTH FROM CURRENT_DATE) >= 7 
    THEN EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
    ELSE EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER - 1
  END;
$$;

-- Create function to calculate total maintenance spend for a property in a financial year
CREATE OR REPLACE FUNCTION public.get_property_maintenance_spend(
  p_property_id UUID,
  p_financial_year INTEGER DEFAULT NULL
)
RETURNS TABLE (
  total_spend DECIMAL(10,2),
  category_spend JSONB
)
LANGUAGE PLPGSQL
STABLE
SECURITY DEFINER
AS $$
DECLARE
  target_year INTEGER;
  start_date DATE;
  end_date DATE;
BEGIN
  -- Use provided year or current financial year
  target_year := COALESCE(p_financial_year, public.get_current_financial_year());
  
  -- Calculate financial year date range (July 1 - June 30)
  start_date := (target_year || '-07-01')::DATE;
  end_date := ((target_year + 1) || '-06-30')::DATE;
  
  RETURN QUERY
  WITH maintenance_costs AS (
    SELECT 
      mr.budget_category_id,
      bc.name as category_name,
      COALESCE(i.total_amount_with_gst, mr.quoted_amount, 0) as cost
    FROM public.maintenance_requests mr
    LEFT JOIN public.invoices i ON mr.invoice_id = i.id
    LEFT JOIN public.budget_categories bc ON mr.budget_category_id = bc.id
    WHERE mr.property_id = p_property_id
      AND mr.status = 'completed'
      AND mr.created_at::DATE BETWEEN start_date AND end_date
      AND COALESCE(i.total_amount_with_gst, mr.quoted_amount, 0) > 0
  ),
  category_totals AS (
    SELECT 
      COALESCE(category_name, 'Uncategorized') as category,
      SUM(cost) as total
    FROM maintenance_costs
    GROUP BY category_name
  )
  SELECT 
    COALESCE(SUM(cost), 0) as total_spend,
    COALESCE(
      jsonb_object_agg(category, total),
      '{}'::jsonb
    ) as category_spend
  FROM maintenance_costs, category_totals;
END;
$$;
