-- Create security definer function to check slug existence
-- This bypasses RLS to accurately detect duplicate organization slugs
CREATE OR REPLACE FUNCTION public.slug_exists(slug_to_check text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations WHERE slug = slug_to_check
  );
$$;