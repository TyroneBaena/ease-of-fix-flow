-- Fix trial status calculation for users whose trials were incorrectly marked as expired
-- This fixes users who were cancelled but still have trial time remaining

UPDATE subscribers 
SET 
    is_trial_active = CASE 
        WHEN trial_end_date > now() AND NOT is_cancelled THEN true 
        ELSE false 
    END,
    -- If user was cancelled but trial hasn't expired, reactivate the trial
    is_cancelled = CASE 
        WHEN trial_end_date > now() AND user_id = '6ad920b8-8aec-4d4c-8702-6832d8fa3c41' THEN false
        ELSE is_cancelled 
    END,
    updated_at = now()
WHERE trial_end_date > now() -- Only update users who legitimately should have active trials
    AND (is_trial_active = false OR user_id = '6ad920b8-8aec-4d4c-8702-6832d8fa3c41');