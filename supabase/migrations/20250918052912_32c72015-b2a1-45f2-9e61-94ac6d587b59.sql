-- Fix existing users without organization IDs and ensure they get organizations
-- This is critical for Phase 3 functionality

-- First, let's see which users don't have organizations
DO $$
DECLARE
  user_record RECORD;
  new_org_id UUID;
  org_name TEXT;
  org_slug TEXT;
BEGIN
  -- Process users without organization_id
  FOR user_record IN 
    SELECT id, email, name, role 
    FROM public.profiles 
    WHERE organization_id IS NULL
  LOOP
    RAISE LOG 'Processing user without organization: % (%)', user_record.email, user_record.id;
    
    -- Create organization for this user
    org_name := COALESCE(user_record.name, split_part(user_record.email, '@', 1)) || '''s Organization';
    org_slug := lower(regexp_replace(COALESCE(user_record.name, split_part(user_record.email, '@', 1)), '[^a-zA-Z0-9]', '', 'g')) || 
                substr(md5(random()::text || user_record.id::text), 1, 6);
    
    -- Insert organization
    INSERT INTO public.organizations (name, slug, created_by)
    VALUES (org_name, org_slug, user_record.id)
    RETURNING id INTO new_org_id;
    
    -- Update user profile
    UPDATE public.profiles 
    SET 
      organization_id = new_org_id,
      session_organization_id = new_org_id,
      role = CASE WHEN role IS NULL THEN 'admin' ELSE role END,
      updated_at = now()
    WHERE id = user_record.id;
    
    -- Create user organization membership
    INSERT INTO public.user_organizations (
      user_id, 
      organization_id, 
      role, 
      is_active, 
      is_default
    ) VALUES (
      user_record.id, 
      new_org_id, 
      COALESCE(user_record.role, 'admin'), 
      true, 
      true
    )
    ON CONFLICT (user_id, organization_id) DO UPDATE SET
      role = EXCLUDED.role,
      is_active = true,
      is_default = true,
      updated_at = now();
    
    RAISE LOG 'Created organization % for user %', new_org_id, user_record.email;
  END LOOP;
  
  -- Also ensure contractors have organization_id
  UPDATE public.contractors 
  SET organization_id = (
    SELECT organization_id 
    FROM public.profiles 
    WHERE profiles.id = contractors.user_id
  )
  WHERE organization_id IS NULL 
  AND user_id IS NOT NULL;
  
  RAISE LOG 'Data migration completed for existing users';
END $$;