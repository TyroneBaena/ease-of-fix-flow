-- Fix missing organization_id for existing users
-- First, let's create a default organization for existing users
DO $$
DECLARE
    default_org_id UUID;
    user_record RECORD;
BEGIN
    -- Create a default organization if it doesn't exist
    INSERT INTO public.organizations (name, slug, created_by)
    VALUES ('Default Organization', 'default-org', (SELECT id FROM profiles LIMIT 1))
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO default_org_id;
    
    -- If the organization already exists, get its ID
    IF default_org_id IS NULL THEN
        SELECT id INTO default_org_id 
        FROM public.organizations 
        WHERE slug = 'default-org';
    END IF;
    
    -- Update all profiles with NULL organization_id to use the default organization
    UPDATE public.profiles 
    SET organization_id = default_org_id 
    WHERE organization_id IS NULL;
    
    -- Update all other tables that might have NULL organization_id
    UPDATE public.maintenance_requests 
    SET organization_id = default_org_id 
    WHERE organization_id IS NULL;
    
    UPDATE public.properties 
    SET organization_id = default_org_id 
    WHERE organization_id IS NULL;
    
    UPDATE public.contractors 
    SET organization_id = default_org_id 
    WHERE organization_id IS NULL;
    
    UPDATE public.notifications 
    SET organization_id = default_org_id 
    WHERE organization_id IS NULL;
    
    UPDATE public.comments 
    SET organization_id = default_org_id 
    WHERE organization_id IS NULL;
    
    -- Log the results
    RAISE NOTICE 'Updated organization_id for all existing data to: %', default_org_id;
END $$;