-- FIX 1: Remove cross-organization quote violation
-- This quote violates multi-tenancy security
DELETE FROM quotes 
WHERE id = '9937a9ce-8c6f-4bfb-9fd9-dee4c6e4621a';

-- FIX 2: Clean up orphaned test subscriber records
-- These users don't exist in auth.users and cause errors
DELETE FROM subscribers 
WHERE user_id IN (
  'f70064a7-bd96-4a55-88f7-ebd2a801e446',  -- test-reminder-1day-1759908836322
  'a2aec229-e446-4790-94eb-c19e016ef2ab',  -- test-reminder-3days-1759908835741
  '0563cc36-b76f-4077-aa07-8f7bb15d3561',  -- test-reminder-7days-1759908835132
  'cf49a84f-1c6f-4bb7-8768-b00defc9eea2',  -- test-reminder-1day-1759908554384
  '876d4575-a1bb-4129-888d-18ee820a3c82',  -- test-reminder-3days-1759908553805
  'bcf96c4f-072c-40e3-b028-b380cb247d59'   -- test-reminder-7days-1759908553207
);

-- FIX 3: Add search_path to functions (security best practice)
-- Fix function: send_comment_email_notification
ALTER FUNCTION public.send_comment_email_notification(uuid, text, text, text)
SET search_path = public;

-- Fix function: create_comment_notifications
ALTER FUNCTION public.create_comment_notifications(uuid, text, text)
SET search_path = public;

-- Fix function: send_comment_email_notifications_v2
ALTER FUNCTION public.send_comment_email_notifications_v2(uuid)
SET search_path = public;