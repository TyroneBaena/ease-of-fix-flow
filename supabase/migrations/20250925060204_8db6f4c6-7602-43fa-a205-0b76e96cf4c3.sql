-- Add unique constraint on user_id column for subscribers table
ALTER TABLE public.subscribers ADD CONSTRAINT subscribers_user_id_unique UNIQUE (user_id);

-- Make user_id NOT NULL since it should always be set for subscribers
ALTER TABLE public.subscribers ALTER COLUMN user_id SET NOT NULL;