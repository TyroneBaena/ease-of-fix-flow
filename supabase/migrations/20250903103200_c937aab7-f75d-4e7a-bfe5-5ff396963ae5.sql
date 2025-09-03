-- Fix missing profile for authenticated user
-- This creates a profile for users who are authenticated but missing from profiles table

DO $$
DECLARE
    missing_user_id UUID := 'a4628b24-b181-4e98-b7d1-8ece91971496';
    new_org_id UUID;
    org_name TEXT;
    org_slug TEXT;
BEGIN
    -- Check if this user already has a profile
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = missing_user_id) THEN
        
        -- Create a new organization for this user
        org_name := 'Admin Organization';
        org_slug := 'admin-org-' || substr(md5(random()::text), 1, 6);
        
        INSERT INTO public.organizations (name, slug, created_by)
        VALUES (org_name, org_slug, missing_user_id)
        RETURNING id INTO new_org_id;
        
        -- Create the profile record
        INSERT INTO public.profiles (
            id, 
            email, 
            name, 
            role, 
            organization_id,
            session_organization_id,
            assigned_properties,
            created_at,
            updated_at
        ) VALUES (
            missing_user_id,
            'pakoli@cyclelove.cc', -- Using email from logs
            'User Account 1',
            'admin',
            new_org_id,
            new_org_id, -- Set session org immediately
            ARRAY[]::TEXT[],
            now(),
            now()
        );
        
        -- Create user organization membership
        INSERT INTO public.user_organizations (
            user_id,
            organization_id,
            role,
            is_active,
            is_default
        ) VALUES (
            missing_user_id,
            new_org_id,
            'admin',
            true,
            true
        );
        
        RAISE NOTICE 'Created profile and organization for user: %', missing_user_id;
        
    ELSE
        RAISE NOTICE 'Profile already exists for user: %', missing_user_id;
    END IF;
END $$;