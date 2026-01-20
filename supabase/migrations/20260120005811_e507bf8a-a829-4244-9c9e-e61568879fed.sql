-- Fix stale cancellation flags for active subscriptions
UPDATE subscribers 
SET 
  is_cancelled = false,
  subscribed = true,
  cancellation_date = null,
  updated_at = now()
WHERE subscription_status = 'active'
  AND (is_cancelled = true OR subscribed = false);