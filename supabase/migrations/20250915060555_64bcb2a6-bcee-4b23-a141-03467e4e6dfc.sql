-- Fix security warnings by adding search_path to functions

-- Update the new function to have proper search_path
CREATE OR REPLACE FUNCTION public.log_organization_creation_simple()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Just log and continue, don't block on errors
  RAISE LOG 'Organization created: id=%, name=%, created_by=%', NEW.id, NEW.name, NEW.created_by;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block the insert
    RAISE LOG 'Organization creation logging error: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Also fix any other functions that might need search_path
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