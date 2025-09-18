-- Manually fix the user who doesn't have a profile due to the trigger failure
-- This is a one-time fix for scarab22596@aminating.com

DO $$
DECLARE
    user_id UUID := 'c655ae84-5bc3-4262-8346-1e1f43fcafb3';
    user_email TEXT := 'scarab22596@aminating.com';
    user_name TEXT := 'React';
    new_org_id UUID;
    org_slug TEXT;
BEGIN
    -- Check if profile already exists
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id) THEN
        -- Create the missing profile
        INSERT INTO public.profiles (
            id, 
            email, 
            name, 
            role,
            created_at,
            updated_at
        ) VALUES (
            user_id,
            user_email,
            user_name,
            'admin',
            NOW(),
            NOW()
        );
        
        RAISE LOG 'Created missing profile for user: %', user_email;
        
        -- Create organization for this user
        org_slug := 'react' || substring(user_id::text, 1, 8);
        
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
            user_name || '''s Organization',
            org_slug,
            user_id,
            '{}',
            NOW(),
            NOW()
        ) RETURNING id INTO new_org_id;
        
        RAISE LOG 'Created organization for user: %, org_id: %', user_email, new_org_id;
        
        -- Update the profile with organization info
        UPDATE public.profiles SET 
            organization_id = new_org_id,
            session_organization_id = new_org_id,
            updated_at = NOW()
        WHERE id = user_id;
        
        -- Create user_organizations record
        INSERT INTO public.user_organizations (
            user_id,
            organization_id,
            role,
            is_active,
            is_default,
            created_at
        ) VALUES (
            user_id,
            new_org_id,
            'admin',
            true,
            true,
            NOW()
        ) ON CONFLICT (user_id, organization_id) DO NOTHING;
        
        -- Create default budget categories
        INSERT INTO public.budget_categories (
            organization_id,
            name,
            monthly_budget,
            created_at,
            updated_at
        ) VALUES 
            (new_org_id, 'Maintenance', 5000.00, NOW(), NOW()),
            (new_org_id, 'Repairs', 3000.00, NOW(), NOW()),
            (new_org_id, 'Utilities', 2000.00, NOW(), NOW()),
            (new_org_id, 'Cleaning', 1000.00, NOW(), NOW()),
            (new_org_id, 'Landscaping', 1500.00, NOW(), NOW())
        ON CONFLICT DO NOTHING;
        
        RAISE LOG 'Fixed missing data for user: %', user_email;
    ELSE
        RAISE LOG 'Profile already exists for user: %', user_email;
    END IF;
END $$;