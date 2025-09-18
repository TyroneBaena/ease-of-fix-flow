-- Simple fix: just create the missing profile and organization for the user
-- Skip budget categories for now

INSERT INTO public.profiles (
    id, 
    email, 
    name, 
    role,
    created_at,
    updated_at
) VALUES (
    'c655ae84-5bc3-4262-8346-1e1f43fcafb3',
    'scarab22596@aminating.com',
    'React',
    'admin',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    updated_at = NOW();

-- Create organization
DO $$
DECLARE
    new_org_id UUID;
BEGIN
    INSERT INTO public.organizations (
        id,
        name,
        slug,
        created_by,
        settings,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        'React''s Organization',
        'reactc655ae84',
        'c655ae84-5bc3-4262-8346-1e1f43fcafb3',
        '{}',
        NOW(),
        NOW()
    ) RETURNING id INTO new_org_id;
    
    -- Update profile with organization
    UPDATE public.profiles SET 
        organization_id = new_org_id,
        session_organization_id = new_org_id,
        updated_at = NOW()
    WHERE id = 'c655ae84-5bc3-4262-8346-1e1f43fcafb3';
    
    -- Create user_organizations record
    INSERT INTO public.user_organizations (
        user_id,
        organization_id,
        role,
        is_active,
        is_default,
        created_at
    ) VALUES (
        'c655ae84-5bc3-4262-8346-1e1f43fcafb3',
        new_org_id,
        'admin',
        true,
        true,
        NOW()
    ) ON CONFLICT (user_id, organization_id) DO NOTHING;
    
    RAISE LOG 'Created profile and organization for scarab22596@aminating.com';
END $$;