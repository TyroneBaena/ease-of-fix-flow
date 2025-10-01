-- Add columns to subscribers table for Stripe webhook handling
ALTER TABLE public.subscribers 
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS failed_payment_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_payment_attempt TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trialing';

-- Add index for faster webhook lookups
CREATE INDEX IF NOT EXISTS idx_subscribers_stripe_customer_id ON public.subscribers(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscribers_stripe_subscription_id ON public.subscribers(stripe_subscription_id);

-- Add comment for documentation
COMMENT ON COLUMN public.subscribers.payment_status IS 'Stripe payment status: active, past_due, unpaid, canceled';
COMMENT ON COLUMN public.subscribers.subscription_status IS 'Stripe subscription status: trialing, active, past_due, canceled, unpaid';
COMMENT ON COLUMN public.subscribers.failed_payment_count IS 'Number of consecutive failed payment attempts';