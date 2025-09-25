-- Task 1.1: Subscribers Table Enhancement
-- Add trial tracking columns
ALTER TABLE public.subscribers 
ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_trial_active BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cancellation_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS setup_intent_id TEXT,
ADD COLUMN IF NOT EXISTS payment_method_id TEXT,
ADD COLUMN IF NOT EXISTS active_properties_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_billing_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMP WITH TIME ZONE;

-- Task 1.2: Property Count Tracking Setup
-- Create function to update property count for a user
CREATE OR REPLACE FUNCTION public.update_subscriber_property_count()
RETURNS TRIGGER AS $$
DECLARE
  org_property_count INTEGER;
  org_id UUID;
BEGIN
  -- Get the organization_id from the changed property
  IF TG_OP = 'DELETE' THEN
    org_id := OLD.organization_id;
  ELSE
    org_id := NEW.organization_id;
  END IF;
  
  -- Count active properties for this organization
  SELECT COUNT(*) INTO org_property_count 
  FROM public.properties 
  WHERE organization_id = org_id;
  
  -- Update all subscribers in this organization with the new property count
  UPDATE public.subscribers 
  SET active_properties_count = org_property_count,
      updated_at = now()
  WHERE user_id IN (
    SELECT id FROM public.profiles 
    WHERE organization_id = org_id
  );
  
  -- Log the update for debugging
  RAISE LOG 'Updated property count for organization %: % properties', org_id, org_property_count;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for property count tracking
DROP TRIGGER IF EXISTS trigger_update_property_count_on_insert ON public.properties;
CREATE TRIGGER trigger_update_property_count_on_insert
  AFTER INSERT ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.update_subscriber_property_count();

DROP TRIGGER IF EXISTS trigger_update_property_count_on_delete ON public.properties;
CREATE TRIGGER trigger_update_property_count_on_delete
  AFTER DELETE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.update_subscriber_property_count();

-- Create function to initialize property count for existing data
CREATE OR REPLACE FUNCTION public.initialize_property_counts()
RETURNS void AS $$
DECLARE
  org_record RECORD;
  property_count INTEGER;
BEGIN
  -- Loop through all organizations
  FOR org_record IN 
    SELECT DISTINCT organization_id 
    FROM public.properties 
    WHERE organization_id IS NOT NULL
  LOOP
    -- Count properties for this organization
    SELECT COUNT(*) INTO property_count
    FROM public.properties 
    WHERE organization_id = org_record.organization_id;
    
    -- Update subscribers for this organization
    UPDATE public.subscribers 
    SET active_properties_count = property_count,
        updated_at = now()
    WHERE user_id IN (
      SELECT id FROM public.profiles 
      WHERE organization_id = org_record.organization_id
    );
    
    RAISE LOG 'Initialized property count for organization %: % properties', 
      org_record.organization_id, property_count;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Initialize property counts for existing data
SELECT public.initialize_property_counts();

-- Enable real-time updates for subscribers table
ALTER TABLE public.subscribers REPLICA IDENTITY FULL;

-- Create index for better performance on property count queries
CREATE INDEX IF NOT EXISTS idx_properties_organization_id ON public.properties(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscribers_user_id ON public.subscribers(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON public.profiles(organization_id);

-- Add helpful comments
COMMENT ON COLUMN public.subscribers.trial_start_date IS 'When the 30-day trial period started';
COMMENT ON COLUMN public.subscribers.trial_end_date IS 'When the trial period expires';
COMMENT ON COLUMN public.subscribers.is_trial_active IS 'Whether user is currently in trial period';
COMMENT ON COLUMN public.subscribers.is_cancelled IS 'Whether subscription has been cancelled';
COMMENT ON COLUMN public.subscribers.active_properties_count IS 'Number of active properties for billing calculation';
COMMENT ON COLUMN public.subscribers.setup_intent_id IS 'Stripe Setup Intent ID for card on file';
COMMENT ON COLUMN public.subscribers.payment_method_id IS 'Stripe Payment Method ID';
COMMENT ON COLUMN public.subscribers.last_billing_date IS 'Date of last successful billing';
COMMENT ON COLUMN public.subscribers.next_billing_date IS 'Date of next scheduled billing';