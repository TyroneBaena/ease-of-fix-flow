-- Fix the trigger function to properly handle organization creation for every user
-- The issue is with the logic and error handling

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_org_id UUID;
    user_name TEXT;
    org_slug TEXT;
BEGIN
    -- Log the signup attempt
    RAISE LOG 'Processing new user signup: %', NEW.email;
    
    -- Extract user name from metadata or email
    user_name := COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1));
    
    -- Create profile with admin role (every user gets their own org and becomes admin)
    INSERT INTO public.profiles (
        id, 
        email, 
        name, 
        role,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        user_name,
        'admin',  -- Every user is admin of their own organization
        NOW(),
        NOW()
    );
    
    RAISE LOG 'Created profile for user: %, role: admin', NEW.email;
    
    -- Create organization for this user
    BEGIN
        -- Generate a unique slug
        org_slug := LOWER(REPLACE(user_name, ' ', '')) || substring(NEW.id::text, 1, 8);
        
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
            NEW.id,
            '{}',
            NOW(),
            NOW()
        ) RETURNING id INTO new_org_id;
        
        RAISE LOG 'Organization created: id=%, name=%, created_by=%', new_org_id, user_name || '''s Organization', NEW.id;
        
        -- Update the profile with organization info
        UPDATE public.profiles SET 
            organization_id = new_org_id,
            session_organization_id = new_org_id,
            updated_at = NOW()
        WHERE id = NEW.id;
        
        -- Create user_organizations record
        INSERT INTO public.user_organizations (
            user_id,
            organization_id,
            role,
            is_active,
            is_default,
            created_at
        ) VALUES (
            NEW.id,
            new_org_id,
            'admin',
            true,
            true,
            NOW()
        ) ON CONFLICT (user_id, organization_id) DO NOTHING;  -- Handle duplicates gracefully
        
        -- Create default budget categories for the organization
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
        ON CONFLICT DO NOTHING;  -- Handle any potential duplicates
        
        RAISE LOG 'Created organization % for user %', new_org_id, NEW.id;
        RAISE LOG 'Created default budget categories for organization: %', new_org_id;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE LOG 'Error creating organization for user %: %', NEW.id, SQLERRM;
            -- Organization creation failed, but user profile exists
            -- This is not critical for signup completion
    END;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Critical error in handle_new_user for user %: %', NEW.id, SQLERRM;
        -- Still return NEW to not block user creation
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;