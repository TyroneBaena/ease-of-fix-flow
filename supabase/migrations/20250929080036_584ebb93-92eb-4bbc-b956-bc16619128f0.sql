-- Fix the trial status for the user whose trial should still be active
UPDATE subscribers 
SET is_trial_active = true,
    updated_at = now()
WHERE user_id = '6ad920b8-8aec-4d4c-8702-6832d8fa3c41'
  AND trial_end_date > now()
  AND is_trial_active = false;