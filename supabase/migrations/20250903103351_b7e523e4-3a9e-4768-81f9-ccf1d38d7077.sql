-- Create profile and organization for missing user
-- Direct approach since user_organizations might not exist

DO $$
DECLARE
    missing_user_id UUID := 'a4628b24-b181-4e98-b7d1-8ece91971496';
    new_org_id UUID;
BEGIN
    -- Create organization first
    INSERT INTO public.organizations (name, slug, created_by)
    VALUES ('Admin Organization', 'admin-org-' || substr(md5(random()::text), 1, 8), missing_user_id)
    RETURNING id INTO new_org_id;
    
    -- Create profile
    INSERT INTO public.profiles (
        id, 
        email, 
        name, 
        role, 
        organization_id,
        session_organization_id,
        assigned_properties
    ) VALUES (
        missing_user_id,
        'pakoli@cyclelove.cc',
        'User Account 1',
        'admin',
        new_org_id,
        new_org_id,
        ARRAY[]::TEXT[]
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
    ) ON CONFLICT (user_id, organization_id) DO NOTHING;
    
    RAISE NOTICE 'Created complete setup for user: %', missing_user_id;
END $$;