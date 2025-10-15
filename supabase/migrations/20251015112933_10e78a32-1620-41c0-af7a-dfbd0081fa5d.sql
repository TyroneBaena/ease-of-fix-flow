-- ============================================
-- MIGRATION: Consolidate Duplicate Subscriptions and Make Organization-Based
-- ============================================

-- Step 1: Add organization_id column if not exists
ALTER TABLE public.subscribers 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Step 2: Populate organization_id for existing subscribers
UPDATE public.subscribers s
SET organization_id = p.organization_id
FROM public.profiles p
WHERE s.user_id = p.id
AND s.organization_id IS NULL
AND p.organization_id IS NOT NULL;

-- Step 3: Get from user_organizations if still null
UPDATE public.subscribers s
SET organization_id = (
  SELECT uo.organization_id 
  FROM public.user_organizations uo 
  WHERE uo.user_id = s.user_id 
  AND uo.is_active = true 
  ORDER BY uo.is_default DESC, uo.created_at ASC
  LIMIT 1
)
WHERE s.organization_id IS NULL;

-- Step 4: Delete orphaned records with no organization
DELETE FROM public.subscribers 
WHERE organization_id IS NULL;

-- Step 5: Consolidate duplicates - keep the most recent active subscription per organization
-- First, mark which records to keep
WITH ranked_subscriptions AS (
  SELECT 
    id,
    organization_id,
    ROW_NUMBER() OVER (
      PARTITION BY organization_id 
      ORDER BY 
        CASE WHEN is_trial_active THEN 1 ELSE 2 END,  -- Active trials first
        CASE WHEN subscribed THEN 1 ELSE 2 END,        -- Then subscribed
        created_at DESC                                 -- Then most recent
    ) as rn
  FROM public.subscribers
)
DELETE FROM public.subscribers
WHERE id IN (
  SELECT id FROM ranked_subscriptions WHERE rn > 1
);

-- Step 6: Make organization_id required and add unique constraint
ALTER TABLE public.subscribers 
ALTER COLUMN organization_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscribers_organization_unique 
ON public.subscribers(organization_id);

-- Step 7: Add created_by column
ALTER TABLE public.subscribers 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

UPDATE public.subscribers 
SET created_by = user_id 
WHERE created_by IS NULL;

-- Step 8: Update RLS policies
DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.subscribers;
DROP POLICY IF EXISTS "Users can select their own subscription" ON public.subscribers;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.subscribers;

CREATE POLICY "Users can view their organization subscription"
ON public.subscribers
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id 
    FROM public.user_organizations 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Admins can create organization subscription"
ON public.subscribers
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_organizations uo
    WHERE uo.user_id = auth.uid()
    AND uo.organization_id = subscribers.organization_id
    AND uo.role = 'admin'
    AND uo.is_active = true
  )
);

CREATE POLICY "Admins can update organization subscription"
ON public.subscribers
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_organizations uo
    WHERE uo.user_id = auth.uid()
    AND uo.organization_id = subscribers.organization_id
    AND uo.role = 'admin'
    AND uo.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_organizations uo
    WHERE uo.user_id = auth.uid()
    AND uo.organization_id = subscribers.organization_id
    AND uo.role = 'admin'
    AND uo.is_active = true
  )
);

-- Step 9: Add comments
COMMENT ON COLUMN public.subscribers.organization_id IS 'Organization that owns this subscription. One subscription per organization, shared by all members.';
COMMENT ON COLUMN public.subscribers.user_id IS 'Legacy field for Stripe customer records compatibility.';
COMMENT ON COLUMN public.subscribers.created_by IS 'Admin user who created the organization subscription.';

-- Step 10: Create helper function
CREATE OR REPLACE FUNCTION public.get_organization_subscription(org_id UUID)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  subscribed BOOLEAN,
  subscription_tier TEXT,
  subscription_status TEXT,
  is_trial_active BOOLEAN,
  is_cancelled BOOLEAN,
  trial_end_date TIMESTAMPTZ,
  active_properties_count INTEGER,
  payment_method_id TEXT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    s.id,
    s.organization_id,
    s.subscribed,
    s.subscription_tier,
    s.subscription_status,
    s.is_trial_active,
    s.is_cancelled,
    s.trial_end_date,
    s.active_properties_count,
    s.payment_method_id
  FROM public.subscribers s
  WHERE s.organization_id = org_id;
$$;