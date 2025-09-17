-- Disable the auto-organization creation trigger that bypasses onboarding
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;