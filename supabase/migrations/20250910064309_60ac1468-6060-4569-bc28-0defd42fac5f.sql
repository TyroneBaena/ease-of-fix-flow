-- Fix: Create budget categories for the correct organization (09dac158-5f87-421f-a81b-dbba27403927)
-- and implement automatic category creation for future organizations

-- 1. Create budget categories for the current user's organization
INSERT INTO public.budget_categories (id, name, description, organization_id, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'General Maintenance', 'General maintenance and repair work', '09dac158-5f87-421f-a81b-dbba27403927'::uuid, now(), now()),
  (gen_random_uuid(), 'Plumbing', 'Plumbing repairs and installations', '09dac158-5f87-421f-a81b-dbba27403927'::uuid, now(), now()),
  (gen_random_uuid(), 'Electrical', 'Electrical repairs and installations', '09dac158-5f87-421f-a81b-dbba27403927'::uuid, now(), now()),
  (gen_random_uuid(), 'HVAC', 'Heating, ventilation, and air conditioning', '09dac158-5f87-421f-a81b-dbba27403927'::uuid, now(), now()),
  (gen_random_uuid(), 'Landscaping', 'Garden and outdoor maintenance', '09dac158-5f87-421f-a81b-dbba27403927'::uuid, now(), now()),
  (gen_random_uuid(), 'Cleaning', 'Cleaning and janitorial services', '09dac158-5f87-421f-a81b-dbba27403927'::uuid, now(), now()),
  (gen_random_uuid(), 'Security', 'Security systems and access control', '09dac158-5f87-421f-a81b-dbba27403927'::uuid, now(), now()),
  (gen_random_uuid(), 'Emergency Repairs', 'Urgent repairs and emergency maintenance', '09dac158-5f87-421f-a81b-dbba27403927'::uuid, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 2. Create function to automatically create default budget categories for new organizations
CREATE OR REPLACE FUNCTION public.create_default_budget_categories(org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create if no categories exist for this organization
  IF NOT EXISTS (SELECT 1 FROM budget_categories WHERE organization_id = org_id) THEN
    INSERT INTO public.budget_categories (id, name, description, organization_id, created_at, updated_at)
    VALUES 
      (gen_random_uuid(), 'General Maintenance', 'General maintenance and repair work', org_id, now(), now()),
      (gen_random_uuid(), 'Plumbing', 'Plumbing repairs and installations', org_id, now(), now()),
      (gen_random_uuid(), 'Electrical', 'Electrical repairs and installations', org_id, now(), now()),
      (gen_random_uuid(), 'HVAC', 'Heating, ventilation, and air conditioning', org_id, now(), now()),
      (gen_random_uuid(), 'Landscaping', 'Garden and outdoor maintenance', org_id, now(), now()),
      (gen_random_uuid(), 'Cleaning', 'Cleaning and janitorial services', org_id, now(), now()),
      (gen_random_uuid(), 'Security', 'Security systems and access control', org_id, now(), now()),
      (gen_random_uuid(), 'Emergency Repairs', 'Urgent repairs and emergency maintenance', org_id, now(), now());
    
    RAISE LOG 'Created default budget categories for organization: %', org_id;
  END IF;
END;
$$;

-- 3. Create trigger to automatically create budget categories when new organization is created
CREATE OR REPLACE FUNCTION public.handle_new_organization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create default budget categories for the new organization
  PERFORM public.create_default_budget_categories(NEW.id);
  RETURN NEW;
END;
$$;

-- Create trigger for new organizations
DROP TRIGGER IF EXISTS create_budget_categories_for_new_org ON public.organizations;
CREATE TRIGGER create_budget_categories_for_new_org
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_organization();

-- 4. Ensure all existing organizations have budget categories
-- (This will catch any organizations that don't have categories yet)
DO $$
DECLARE
  org_record RECORD;
BEGIN
  FOR org_record IN SELECT id FROM public.organizations LOOP
    PERFORM public.create_default_budget_categories(org_record.id);
  END LOOP;
END $$;

-- 5. Add logging function to help debug organization context issues
CREATE OR REPLACE FUNCTION public.debug_organization_context()
RETURNS TABLE(
  user_id uuid,
  user_email text,
  user_role text,
  profile_org_id uuid,
  session_org_id uuid,
  current_org_function uuid,
  budget_categories_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  user_org_id uuid;
BEGIN
  current_user_id := auth.uid();
  user_org_id := public.get_current_user_organization();
  
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.role,
    p.organization_id,
    p.session_organization_id,
    user_org_id,
    COALESCE((SELECT count(*) FROM budget_categories WHERE organization_id = user_org_id), 0)
  FROM profiles p
  WHERE p.id = current_user_id;
END;
$$;