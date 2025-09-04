-- Fix Critical Security Issues in RLS Policies

-- 1. Fix Email Relay Keys - Restrict to organization-specific access
DROP POLICY IF EXISTS "Admin/Manager can view email relay keys" ON public.email_relay_keys;

CREATE POLICY "Users can view email relay keys in their organization"
ON public.email_relay_keys
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.maintenance_requests mr
    WHERE mr.id = email_relay_keys.request_id
    AND mr.organization_id = public.get_current_user_organization()
  )
);

-- 2. Fix Budget Categories - Add organization-based access
ALTER TABLE public.budget_categories ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Update existing budget categories to have organization_id (this is a one-time migration)
UPDATE public.budget_categories 
SET organization_id = (
  SELECT id FROM public.organizations 
  ORDER BY created_at ASC 
  LIMIT 1
)
WHERE organization_id IS NULL;

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view budget categories" ON public.budget_categories;

-- Create organization-specific policies
CREATE POLICY "Users can view budget categories in their organization"
ON public.budget_categories
FOR SELECT
TO authenticated
USING (organization_id = public.get_current_user_organization());

CREATE POLICY "Admins can manage budget categories in their organization"
ON public.budget_categories
FOR ALL
TO authenticated
USING (
  organization_id = public.get_current_user_organization() 
  AND public.get_current_user_role() = 'admin'
)
WITH CHECK (
  organization_id = public.get_current_user_organization() 
  AND public.get_current_user_role() = 'admin'
);

-- 3. Add trigger to automatically set organization_id for new budget categories
CREATE OR REPLACE FUNCTION public.set_budget_category_organization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := public.get_current_user_organization();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_budget_category_organization_trigger ON public.budget_categories;
CREATE TRIGGER set_budget_category_organization_trigger
  BEFORE INSERT ON public.budget_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.set_budget_category_organization();