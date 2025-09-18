-- Update all RLS policies to use the safe functions
-- This prevents read-only transaction errors

-- Update activity_logs policy
DROP POLICY IF EXISTS "Users can manage activity logs in their organization" ON activity_logs;
CREATE POLICY "Users can manage activity logs in their organization" 
ON activity_logs 
FOR ALL 
USING (organization_id = get_current_user_organization_safe())
WITH CHECK (organization_id = get_current_user_organization_safe());

-- Update budget_categories policies
DROP POLICY IF EXISTS "Admins can manage budget categories in their organization" ON budget_categories;
DROP POLICY IF EXISTS "Users can view budget categories in their organization" ON budget_categories;

CREATE POLICY "Admins can manage budget categories in their organization" 
ON budget_categories 
FOR ALL 
USING ((organization_id = get_current_user_organization_safe()) AND (get_current_user_role_safe() = 'admin'))
WITH CHECK ((organization_id = get_current_user_organization_safe()) AND (get_current_user_role_safe() = 'admin'));

CREATE POLICY "Users can view budget categories in their organization" 
ON budget_categories 
FOR SELECT 
USING (organization_id = get_current_user_organization_safe());

-- Update comments policy
DROP POLICY IF EXISTS "Users can manage comments in their organization" ON comments;
CREATE POLICY "Users can manage comments in their organization" 
ON comments 
FOR ALL 
USING (organization_id = get_current_user_organization_safe())
WITH CHECK (organization_id = get_current_user_organization_safe());

-- Update contractors policy
DROP POLICY IF EXISTS "Users can manage contractors in their organization" ON contractors;
CREATE POLICY "Users can manage contractors in their organization" 
ON contractors 
FOR ALL 
USING (organization_id = get_current_user_organization_safe())
WITH CHECK (organization_id = get_current_user_organization_safe());

-- Update invoices policy
DROP POLICY IF EXISTS "Users can manage invoices in their organization" ON invoices;
CREATE POLICY "Users can manage invoices in their organization" 
ON invoices 
FOR ALL 
USING (organization_id = get_current_user_organization_safe())
WITH CHECK (organization_id = get_current_user_organization_safe());

-- Update job_schedules policy
DROP POLICY IF EXISTS "Users can manage job schedules in their organization" ON job_schedules;
CREATE POLICY "Users can manage job schedules in their organization" 
ON job_schedules 
FOR ALL 
USING (organization_id = get_current_user_organization_safe())
WITH CHECK (organization_id = get_current_user_organization_safe());

-- Update job_scheduling_history policy
DROP POLICY IF EXISTS "Users can manage job scheduling history in their organization" ON job_scheduling_history;
CREATE POLICY "Users can manage job scheduling history in their organization" 
ON job_scheduling_history 
FOR ALL 
USING (organization_id = get_current_user_organization_safe())
WITH CHECK (organization_id = get_current_user_organization_safe());

-- Update landlords policy
DROP POLICY IF EXISTS "Users can manage landlords in their organization" ON landlords;
CREATE POLICY "Users can manage landlords in their organization" 
ON landlords 
FOR ALL 
USING (organization_id = get_current_user_organization_safe())
WITH CHECK (organization_id = get_current_user_organization_safe());

-- Update maintenance_requests policy
DROP POLICY IF EXISTS "Users can manage maintenance requests in their organization" ON maintenance_requests;
CREATE POLICY "Users can manage maintenance requests in their organization" 
ON maintenance_requests 
FOR ALL 
USING (organization_id = get_current_user_organization_safe())
WITH CHECK (organization_id = get_current_user_organization_safe());

-- Update notifications policy
DROP POLICY IF EXISTS "Users can manage notifications in their organization" ON notifications;
CREATE POLICY "Users can manage notifications in their organization" 
ON notifications 
FOR ALL 
USING (organization_id = get_current_user_organization_safe())
WITH CHECK (organization_id = get_current_user_organization_safe());

-- Update properties policy
DROP POLICY IF EXISTS "Users can manage properties in their organization" ON properties;
CREATE POLICY "Users can manage properties in their organization" 
ON properties 
FOR ALL 
USING (organization_id = get_current_user_organization_safe())
WITH CHECK (organization_id = get_current_user_organization_safe());

-- Update property_budgets policy
DROP POLICY IF EXISTS "Users can manage property budgets in their organization" ON property_budgets;
CREATE POLICY "Users can manage property budgets in their organization" 
ON property_budgets 
FOR ALL 
USING (organization_id = get_current_user_organization_safe())
WITH CHECK (organization_id = get_current_user_organization_safe());

-- Update quote_logs policy
DROP POLICY IF EXISTS "Users can manage quote logs in their organization" ON quote_logs;
CREATE POLICY "Users can manage quote logs in their organization" 
ON quote_logs 
FOR ALL 
USING (organization_id = get_current_user_organization_safe())
WITH CHECK (organization_id = get_current_user_organization_safe());

-- Update quotes policy
DROP POLICY IF EXISTS "Users can manage quotes in their organization" ON quotes;
CREATE POLICY "Users can manage quotes in their organization" 
ON quotes 
FOR ALL 
USING (organization_id = get_current_user_organization_safe())
WITH CHECK (organization_id = get_current_user_organization_safe());

-- Update profiles policies to use safe functions
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON profiles;
DROP POLICY IF EXISTS "Organization admins can update profiles in their organization" ON profiles;

CREATE POLICY "Users can view profiles in their organization" 
ON profiles 
FOR SELECT 
USING (organization_id = get_current_user_organization_safe());

CREATE POLICY "Organization admins can update profiles in their organization" 
ON profiles 
FOR UPDATE 
USING ((get_current_user_role_safe() = 'admin') AND (organization_id IS NOT NULL) AND (organization_id = get_current_user_organization_safe()))
WITH CHECK ((get_current_user_role_safe() = 'admin') AND (organization_id IS NOT NULL) AND (organization_id = get_current_user_organization_safe()));