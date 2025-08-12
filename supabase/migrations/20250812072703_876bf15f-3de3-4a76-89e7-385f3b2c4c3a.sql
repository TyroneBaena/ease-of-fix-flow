
-- 1) Create subscribers table (no FK to auth.users to avoid cross-schema coupling)
CREATE TABLE IF NOT EXISTS public.subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,                                -- store auth user id (no FK)
  email TEXT NOT NULL UNIQUE,                  -- unique user email
  stripe_customer_id TEXT,                     -- Stripe customer id if created
  subscribed BOOLEAN NOT NULL DEFAULT false,   -- active subscription or trial
  subscription_tier TEXT,                      -- Basic/Premium/etc. (derived)
  subscription_end TIMESTAMPTZ,                -- end of current period/trial
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_subscribers_user_id ON public.subscribers(user_id);
CREATE INDEX IF NOT EXISTS idx_subscribers_subscribed ON public.subscribers(subscribed);

-- 2) RLS
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription row (by user_id or email)
DROP POLICY IF EXISTS "select_own_subscription" ON public.subscribers;
CREATE POLICY "select_own_subscription" ON public.subscribers
  FOR SELECT
  USING (user_id = auth.uid() OR email = auth.email());

-- Users can insert their own row (optional; edge functions with service role bypass RLS anyway)
DROP POLICY IF EXISTS "insert_own_subscription" ON public.subscribers;
CREATE POLICY "insert_own_subscription" ON public.subscribers
  FOR INSERT
  WITH CHECK (user_id = auth.uid() OR email = auth.email());

-- Users can update their own row (optional; edge functions with service role bypass RLS)
DROP POLICY IF EXISTS "update_own_subscription" ON public.subscribers;
CREATE POLICY "update_own_subscription" ON public.subscribers
  FOR UPDATE
  USING (user_id = auth.uid() OR email = auth.email());

-- 3) Trigger to keep updated_at current
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS subscribers_set_updated_at ON public.subscribers;
CREATE TRIGGER subscribers_set_updated_at
BEFORE UPDATE ON public.subscribers
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();
