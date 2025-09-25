-- Fix existing trial records that should be active
UPDATE subscribers 
SET is_trial_active = true, 
    updated_at = now()
WHERE trial_end_date > now() 
  AND subscription_tier = 'trial' 
  AND is_trial_active = false;