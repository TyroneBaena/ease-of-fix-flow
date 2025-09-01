-- Optimize the organization creation trigger to prevent timeouts
-- Make it simpler and faster

CREATE OR REPLACE FUNCTION public.create_organization_for_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_org_id UUID;
  org_name TEXT;
  org_slug TEXT;
BEGIN
  -- Simple organization name from email
  org_name := split_part(NEW.email, '@', 1) || '''s Organization';
  
  -- Simple slug without loops - just add random suffix
  org_slug := lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-zA-Z0-9]', '', 'g')) || substr(md5(random()::text), 1, 6);
  
  -- Create organization quickly
  INSERT INTO public.organizations (name, slug, created_by)
  VALUES (org_name, org_slug, NEW.id)
  RETURNING id INTO new_org_id;
  
  -- Update user metadata - this might be causing delays, so make it async
  PERFORM pg_notify('update_user_metadata', json_build_object(
    'user_id', NEW.id,
    'organization_id', new_org_id
  )::text);
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Don't block user creation
    RAISE LOG 'Error creating organization for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;