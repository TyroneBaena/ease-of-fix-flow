-- Fix the jsonb_array_length issue in submit_public_maintenance_request function
-- The error occurs when trying to get array length of a scalar (string) instead of a JSON array

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
  p_attempted_fix text DEFAULT '',
  p_attachments text DEFAULT NULL  -- Changed to text to handle JSON string properly
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  request_id uuid;
  property_org_id uuid;
  property_name text;
  attachments_jsonb jsonb;
  attachments_count integer := 0;
BEGIN
  -- Get the property's organization ID and name
  SELECT p.organization_id, p.name INTO property_org_id, property_name
  FROM public.properties p
  WHERE p.id = p_property_id;
  
  IF property_org_id IS NULL THEN
    RAISE EXCEPTION 'Property not found or has no organization';
  END IF;
  
  -- Handle attachments conversion and count
  IF p_attachments IS NOT NULL AND p_attachments != '' THEN
    BEGIN
      -- Try to parse as JSON
      attachments_jsonb := p_attachments::jsonb;
      -- Get count safely
      IF jsonb_typeof(attachments_jsonb) = 'array' THEN
        attachments_count := jsonb_array_length(attachments_jsonb);
      ELSE
        attachments_count := 1; -- Single attachment
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- If parsing fails, treat as null
      attachments_jsonb := NULL;
      attachments_count := 0;
      RAISE LOG 'Failed to parse attachments JSON: %', p_attachments;
    END;
  ELSE
    attachments_jsonb := NULL;
  END IF;
  
  -- Insert the maintenance request bypassing RLS
  INSERT INTO public.maintenance_requests (
    property_id,
    title,
    description,
    location,
    priority,
    category,
    site,
    status,
    submitted_by,
    issue_nature,
    explanation,
    attempted_fix,
    organization_id,
    user_id,
    attachments,
    created_at,
    updated_at
  ) VALUES (
    p_property_id,
    p_title,
    p_description,
    COALESCE(NULLIF(p_location, ''), (SELECT address FROM properties WHERE id = p_property_id)),
    p_priority,
    COALESCE(NULLIF(p_category, ''), 'General'),
    property_name,
    'pending',
    p_submitted_by,
    COALESCE(NULLIF(p_issue_nature, ''), p_title),
    COALESCE(NULLIF(p_explanation, ''), p_description),
    p_attempted_fix,
    property_org_id,
    NULL,
    attachments_jsonb,
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
      'property_id', p_property_id,
      'attachments_count', attachments_count
    ),
    now()
  );
  
  -- Log the public submission
  RAISE LOG 'Public maintenance request submitted: ID=%, Property=%, Contact=%, Attachments=%', 
    request_id, p_property_id, p_contact_email, attachments_count;
  
  RETURN request_id;
END;
$$;