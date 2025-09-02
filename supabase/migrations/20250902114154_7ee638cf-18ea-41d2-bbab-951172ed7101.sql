-- Remove conflicting tenant schema system and implement clean organization-based multi-tenancy

-- 1. Drop dependent triggers first
DROP TRIGGER IF EXISTS on_auth_user_created_schema ON auth.users;

-- 2. Drop tenant schema related functions
DROP FUNCTION IF EXISTS public.create_tenant_schema(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.use_tenant_schema(text) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_schema() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user_schema() CASCADE;

-- 3. Ensure all tables have organization_id and proper defaults
-- Skip ALTER for now to avoid conflicts

-- 4. Update organization creation trigger to be more robust
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
  attempt INTEGER := 0;
  max_attempts INTEGER := 5;
BEGIN
  -- Only create organization if user doesn't have one
  IF NEW.organization_id IS NULL THEN
    LOOP
      attempt := attempt + 1;
      
      -- Simple organization name from email
      org_name := split_part(NEW.email, '@', 1) || '''s Organization';
      
      -- Generate unique slug with attempt counter
      org_slug := lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-zA-Z0-9]', '', 'g')) || 
                  substr(md5(random()::text || attempt::text), 1, 6);
      
      -- Try to create organization
      BEGIN
        INSERT INTO public.organizations (name, slug, created_by)
        VALUES (org_name, org_slug, NEW.id)
        RETURNING id INTO new_org_id;
        
        -- Update the user's profile with the organization_id
        UPDATE public.profiles 
        SET organization_id = new_org_id 
        WHERE id = NEW.id;
        
        RAISE LOG 'Created organization % for user %', new_org_id, NEW.id;
        EXIT; -- Success, exit loop
        
      EXCEPTION
        WHEN unique_violation THEN
          -- Slug collision, try again
          IF attempt >= max_attempts THEN
            RAISE EXCEPTION 'Failed to create unique organization slug after % attempts', max_attempts;
          END IF;
          CONTINUE;
      END;
    END LOOP;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block user creation
    RAISE LOG 'Error creating organization for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;

-- 5. Create function to ensure user has organization access
CREATE OR REPLACE FUNCTION public.ensure_user_organization_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Ensure the record gets the current user's organization_id
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := public.get_current_user_organization();
    
    -- If still null, this is an error
    IF NEW.organization_id IS NULL THEN
      RAISE EXCEPTION 'User must belong to an organization to create records';
    END IF;
  END IF;
  
  -- Verify user has access to the specified organization
  IF NEW.organization_id != public.get_current_user_organization() THEN
    RAISE EXCEPTION 'Access denied: cannot create records for different organization';
  END IF;
  
  RETURN NEW;
END;
$function$;