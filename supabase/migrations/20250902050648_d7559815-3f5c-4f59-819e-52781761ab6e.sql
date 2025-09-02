-- Step 3: Fix existing users by giving each their own organization
-- This fixes the data privacy issue where everyone sees each other's data

DO $$
DECLARE
    user_record RECORD;
    new_org_id UUID;
    org_name TEXT;
    org_slug TEXT;
    counter INTEGER := 0;
BEGIN
    -- Loop through each user and create their own organization
    FOR user_record IN SELECT id, email, name FROM profiles ORDER BY created_at
    LOOP
        counter := counter + 1;
        
        -- Create organization name from email
        org_name := COALESCE(user_record.name, split_part(user_record.email, '@', 1)) || '''s Organization';
        
        -- Create unique slug
        org_slug := lower(regexp_replace(split_part(user_record.email, '@', 1), '[^a-zA-Z0-9]', '', 'g')) || '_' || counter;
        
        -- Create organization for this user
        INSERT INTO public.organizations (name, slug, created_by)
        VALUES (org_name, org_slug, user_record.id)
        RETURNING id INTO new_org_id;
        
        -- Update user's profile with their own organization
        UPDATE public.profiles 
        SET organization_id = new_org_id 
        WHERE id = user_record.id;
        
        -- Move any properties created by this user to their organization
        UPDATE public.properties 
        SET organization_id = new_org_id 
        WHERE user_id = user_record.id;
        
        -- Move any maintenance requests by this user to their organization
        UPDATE public.maintenance_requests 
        SET organization_id = new_org_id 
        WHERE user_id = user_record.id;
        
        -- Move any contractors created by this user to their organization
        UPDATE public.contractors 
        SET organization_id = new_org_id 
        WHERE user_id = user_record.id;
        
        -- Move any comments by this user to their organization  
        UPDATE public.comments 
        SET organization_id = new_org_id 
        WHERE user_id = user_record.id;
        
        -- Move any notifications for this user to their organization
        UPDATE public.notifications 
        SET organization_id = new_org_id 
        WHERE user_id = user_record.id;
        
        RAISE LOG 'Created organization % for user % (%)', new_org_id, user_record.email, user_record.id;
    END LOOP;
    
    RAISE NOTICE 'Successfully created % organizations for existing users', counter;
END $$;