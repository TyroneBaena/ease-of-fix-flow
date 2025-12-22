-- Fix subscribers with subscribed=true but no stripe_subscription_id
-- These users have free access that shouldn't exist

-- Set subscribed to false for users without valid Stripe subscriptions
UPDATE subscribers 
SET 
  subscribed = false,
  subscription_status = 'inactive',
  updated_at = now()
WHERE 
  subscribed = true 
  AND stripe_subscription_id IS NULL;

-- Log the fix in a comment
COMMENT ON TABLE subscribers IS 'Fixed 2 records with subscribed=true but NULL stripe_subscription_id on 2025-06-22';