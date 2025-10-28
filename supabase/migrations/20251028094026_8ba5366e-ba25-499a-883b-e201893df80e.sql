-- Drop the view if it was created
DROP VIEW IF EXISTS public.subscription_status;

-- Create a secure function to get non-sensitive subscription info
CREATE OR REPLACE FUNCTION public.get_subscription_status(org_id uuid)
RETURNS TABLE(
  organization_id uuid,
  subscribed boolean,
  subscription_tier text,
  subscription_status text,
  subscription_end timestamp with time zone,
  is_trial_active boolean,
  trial_start_date timestamp with time zone,
  trial_end_date timestamp with time zone,
  is_cancelled boolean,
  cancellation_date timestamp with time zone,
  active_properties_count integer,
  next_billing_date timestamp with time zone,
  payment_status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- This function allows all organization members to view subscription status
  -- without exposing sensitive payment details like Stripe IDs
  SELECT 
    s.organization_id,
    s.subscribed,
    s.subscription_tier,
    s.subscription_status,
    s.subscription_end,
    s.is_trial_active,
    s.trial_start_date,
    s.trial_end_date,
    s.is_cancelled,
    s.cancellation_date,
    s.active_properties_count,
    s.next_billing_date,
    s.payment_status
  FROM public.subscribers s
  WHERE s.organization_id = org_id;
$$;