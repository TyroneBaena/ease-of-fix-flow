-- Fix the foreign key constraint issue for public maintenance requests
-- First, make the user_id column nullable for public requests
ALTER TABLE public.maintenance_requests 
ALTER COLUMN user_id DROP NOT NULL;

-- Update the function to use NULL for user_id in public requests
CREATE OR REPLACE FUNCTION public.submit_public_maintenance_request(
  p_property_id uuid,
  p_title text,
  p_description text,
  p_location text DEFAULT '',
  p_priority text DEFAULT 'medium',
  p_category text DEFAULT '',
  p_submitted_by text DEFAULT '',
  p_contact_email text DEFAULT '',
  p_contact_phone text DEFAULT '',
  p_issue_nature text DEFAULT '',
  p_explanation text DEFAULT '',
  p_attempted_fix text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  request_id uuid;
  property_org_id uuid;
BEGIN
  -- Get the property's organization ID
  SELECT p.organization_id INTO property_org_id
  FROM public.properties p
  WHERE p.id = p_property_id;
  
  IF property_org_id IS NULL THEN
    RAISE EXCEPTION 'Property not found or has no organization';
  END IF;
  
  -- Insert the maintenance request bypassing RLS (use NULL for user_id for public requests)
  INSERT INTO public.maintenance_requests (
    property_id,
    title,
    description,
    location,
    priority,
    category,
    status,
    submitted_by,
    issue_nature,
    explanation,
    attempted_fix,
    organization_id,
    user_id,
    created_at,
    updated_at
  ) VALUES (
    p_property_id,
    p_title,
    p_description,
    COALESCE(NULLIF(p_location, ''), (SELECT address FROM properties WHERE id = p_property_id)),
    p_priority,
    COALESCE(NULLIF(p_category, ''), (SELECT name FROM properties WHERE id = p_property_id)),
    'pending',
    p_submitted_by,
    COALESCE(NULLIF(p_issue_nature, ''), p_title),
    COALESCE(NULLIF(p_explanation, ''), p_description),
    p_attempted_fix,
    property_org_id,
    NULL, -- Use NULL for public requests instead of invalid UUID
    now(),
    now()
  ) RETURNING id INTO request_id;
  
  -- Store contact information in a separate log for follow-up
  INSERT INTO public.activity_logs (
    request_id,
    organization_id,
    action_type,
    description,
    actor_name,
    actor_role,
    metadata,
    created_at
  ) VALUES (
    request_id,
    property_org_id,
    'public_request_submitted',
    'Public maintenance request submitted via QR code',
    p_submitted_by,
    'public_user',
    jsonb_build_object(
      'contact_email', p_contact_email,
      'contact_phone', p_contact_phone,
      'submission_method', 'qr_code_public_form',
      'property_id', p_property_id
    ),
    now()
  );
  
  -- Log the public submission
  RAISE LOG 'Public maintenance request submitted: ID=%, Property=%, Contact=%', request_id, p_property_id, p_contact_email;
  
  RETURN request_id;
END;
$function$