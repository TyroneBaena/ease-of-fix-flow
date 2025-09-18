-- Fix the handle_new_user trigger that's causing the organization_id error
-- and incorrect role assignment

-- First, let's recreate the trigger function with proper logic
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    is_first_user BOOLEAN;
    new_org_id UUID;
    appropriate_role TEXT;
BEGIN
    -- Check if this is the first user in the system
    SELECT public.is_first_user_signup() INTO is_first_user;
    
    -- Determine the appropriate role
    SELECT public.get_appropriate_user_role() INTO appropriate_role;
    
    -- Log the role assignment decision
    RAISE LOG 'User signup: %, First user: %, Assigned role: %', NEW.email, is_first_user, appropriate_role;
    
    -- Create profile with the appropriate role
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
        COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
        appropriate_role,
        NOW(),
        NOW()
    );
    
    -- If this is the first user (admin), create an organization automatically
    IF is_first_user THEN
        -- Create organization for the first user
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
            COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email) || '''s Organization',
            LOWER(REPLACE(COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email), ' ', '-')) || '-org',
            NEW.id,
            '{}',
            NOW(),
            NOW()
        ) RETURNING id INTO new_org_id;
        
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
        );
        
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
            (new_org_id, 'Landscaping', 1500.00, NOW(), NOW());
        
        RAISE LOG 'Created organization % for user %', new_org_id, NEW.id;
        RAISE LOG 'Created default budget categories for organization: %', new_org_id;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error creating organization for user %: %', NEW.id, SQLERRM;
        -- Don't fail the entire signup process if organization creation fails
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate the trigger to ensure it's properly attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();