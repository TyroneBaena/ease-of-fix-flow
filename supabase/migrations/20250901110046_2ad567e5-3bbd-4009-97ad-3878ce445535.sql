-- Complete remaining RLS policies for all tables and fix remaining search path issues

-- Complete RLS policies for remaining tables
CREATE POLICY "Users can manage notifications in their organization" 
ON public.notifications 
FOR ALL 
USING (organization_id = get_current_user_organization())
WITH CHECK (organization_id = get_current_user_organization());

CREATE POLICY "Users can manage quotes in their organization" 
ON public.quotes 
FOR ALL 
USING (organization_id = get_current_user_organization())
WITH CHECK (organization_id = get_current_user_organization());

CREATE POLICY "Users can manage invoices in their organization" 
ON public.invoices 
FOR ALL 
USING (organization_id = get_current_user_organization())
WITH CHECK (organization_id = get_current_user_organization());

CREATE POLICY "Users can manage activity logs in their organization" 
ON public.activity_logs 
FOR ALL 
USING (organization_id = get_current_user_organization())
WITH CHECK (organization_id = get_current_user_organization());

CREATE POLICY "Users can manage landlords in their organization" 
ON public.landlords 
FOR ALL 
USING (organization_id = get_current_user_organization())
WITH CHECK (organization_id = get_current_user_organization());

CREATE POLICY "Users can manage job schedules in their organization" 
ON public.job_schedules 
FOR ALL 
USING (organization_id = get_current_user_organization())
WITH CHECK (organization_id = get_current_user_organization());

CREATE POLICY "Users can manage job scheduling history in their organization" 
ON public.job_scheduling_history 
FOR ALL 
USING (organization_id = get_current_user_organization())
WITH CHECK (organization_id = get_current_user_organization());

CREATE POLICY "Users can manage quote logs in their organization" 
ON public.quote_logs 
FOR ALL 
USING (organization_id = get_current_user_organization())
WITH CHECK (organization_id = get_current_user_organization());

CREATE POLICY "Users can manage property budgets in their organization" 
ON public.property_budgets 
FOR ALL 
USING (organization_id = get_current_user_organization())
WITH CHECK (organization_id = get_current_user_organization());

-- Drop old policies that are no longer needed
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;

-- Drop old quote policies
DROP POLICY IF EXISTS "Admins can view all quotes" ON public.quotes;
DROP POLICY IF EXISTS "Admins can update all quotes" ON public.quotes;
DROP POLICY IF EXISTS "Contractors can create quotes" ON public.quotes;
DROP POLICY IF EXISTS "Contractors can insert own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Contractors can insert their own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Contractors can update own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Contractors can update their own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Contractors can view own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Contractors can view their own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Managers can insert quotes for requests" ON public.quotes;
DROP POLICY IF EXISTS "Managers can update quotes" ON public.quotes;
DROP POLICY IF EXISTS "Managers can view all quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can view quotes for their requests" ON public.quotes;
DROP POLICY IF EXISTS "quotes_insert_contractor" ON public.quotes;
DROP POLICY IF EXISTS "quotes_select_contractor" ON public.quotes;
DROP POLICY IF EXISTS "quotes_update_contractor" ON public.quotes;

-- Drop old invoice policies
DROP POLICY IF EXISTS "Admins can view all invoices" ON public.invoices;
DROP POLICY IF EXISTS "Contractors can insert their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Contractors can view their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Managers can view all invoices" ON public.invoices;

-- Drop old activity log policies
DROP POLICY IF EXISTS "Admins can view all activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Admins and managers can insert activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Contractors can insert activity logs for their requests" ON public.activity_logs;
DROP POLICY IF EXISTS "Contractors can view activity logs for assigned requests" ON public.activity_logs;
DROP POLICY IF EXISTS "Managers can view all activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Users can view activity logs for their requests" ON public.activity_logs;

-- Drop old landlord policies
DROP POLICY IF EXISTS "Admins/Managers can view landlords or linked" ON public.landlords;
DROP POLICY IF EXISTS "Admins/Managers can insert landlords" ON public.landlords;
DROP POLICY IF EXISTS "Admins/Managers can update landlords" ON public.landlords;
DROP POLICY IF EXISTS "Admins/Managers can delete landlords" ON public.landlords;

-- Drop old job schedule policies
DROP POLICY IF EXISTS "Admins can view all scheduled jobs" ON public.job_schedules;
DROP POLICY IF EXISTS "Contractors can create their own scheduled jobs" ON public.job_schedules;
DROP POLICY IF EXISTS "Contractors can update their own scheduled jobs" ON public.job_schedules;
DROP POLICY IF EXISTS "Contractors can view their own scheduled jobs" ON public.job_schedules;
DROP POLICY IF EXISTS "Managers can view scheduled jobs for their properties" ON public.job_schedules;

-- Drop old job scheduling history policies
DROP POLICY IF EXISTS "Admins can view all scheduling history" ON public.job_scheduling_history;
DROP POLICY IF EXISTS "Contractors can create their own scheduling history" ON public.job_scheduling_history;
DROP POLICY IF EXISTS "Contractors can view their own scheduling history" ON public.job_scheduling_history;
DROP POLICY IF EXISTS "Managers can view scheduling history for their properties" ON public.job_scheduling_history;

-- Drop old quote log policies
DROP POLICY IF EXISTS "Contractors can create quote logs" ON public.quote_logs;
DROP POLICY IF EXISTS "Contractors can view their own quote logs" ON public.quote_logs;
DROP POLICY IF EXISTS "Managers can view all quote logs" ON public.quote_logs;

-- Drop old property budget policies
DROP POLICY IF EXISTS "Users can manage property budgets for their properties" ON public.property_budgets;
DROP POLICY IF EXISTS "Users can view property budgets for their properties" ON public.property_budgets;