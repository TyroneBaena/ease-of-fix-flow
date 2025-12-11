-- Allow properties.user_id to be NULL for deleted users
ALTER TABLE public.properties ALTER COLUMN user_id DROP NOT NULL;