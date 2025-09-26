-- Create subscriber records for existing users who don't have them
INSERT INTO subscribers (
    user_id,
    email,
    is_trial_active,
    trial_start_date,
    trial_end_date,
    is_cancelled,
    active_properties_count,
    subscribed,
    created_at,
    updated_at
)
SELECT 
    p.id as user_id,
    p.email,
    true as is_trial_active,
    now() as trial_start_date,
    (now() + interval '30 days') as trial_end_date,
    false as is_cancelled,
    0 as active_properties_count,
    false as subscribed,
    now() as created_at,
    now() as updated_at
FROM profiles p
LEFT JOIN subscribers s ON p.id = s.user_id
WHERE s.user_id IS NULL
AND p.email IS NOT NULL;