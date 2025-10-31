-- Fix security issues by explicitly denying public access to sensitive tables

-- 1. Profiles table - Block public access to user emails and phone numbers
DROP POLICY IF EXISTS "Deny public access to profiles" ON public.profiles;
CREATE POLICY "Deny public access to profiles"
ON public.profiles
FOR SELECT
TO anon
USING (false);

-- 2. Contractors table - Block public access to contractor contact information
DROP POLICY IF EXISTS "Deny public access to contractors" ON public.contractors;
CREATE POLICY "Deny public access to contractors"
ON public.contractors
FOR SELECT
TO anon
USING (false);

-- 3. Maintenance requests table - Block public access to request details
DROP POLICY IF EXISTS "Deny public access to maintenance requests" ON public.maintenance_requests;
CREATE POLICY "Deny public access to maintenance requests"
ON public.maintenance_requests
FOR SELECT
TO anon
USING (false);

-- 4. Invoices table - Block public access to financial data
DROP POLICY IF EXISTS "Deny public access to invoices" ON public.invoices;
CREATE POLICY "Deny public access to invoices"
ON public.invoices
FOR SELECT
TO anon
USING (false);