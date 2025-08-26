-- Fix RLS policy inconsistencies for maintenance_requests
-- First, drop redundant and inconsistent policies
DROP POLICY IF EXISTS "Allow admin full access to maintenance requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Allow users to insert their own requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Allow users to update their own requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Allow users to view their own requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Users can create their own maintenance requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Users can insert maintenance requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Users can update their own maintenance requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Users can view their own maintenance requests" ON maintenance_requests;
DROP POLICY IF EXISTS "maintenance_requests_insert_own" ON maintenance_requests;
DROP POLICY IF EXISTS "maintenance_requests_select_own" ON maintenance_requests;
DROP POLICY IF EXISTS "maintenance_requests_update_own" ON maintenance_requests;

-- Create a unified admin access policy using the existing get_current_user_role() function
CREATE POLICY "Admin full access to maintenance requests"
ON maintenance_requests
FOR ALL
USING (get_current_user_role() = 'admin')
WITH CHECK (get_current_user_role() = 'admin');

-- Clean up the remaining policies to avoid conflicts
-- Keep the essential ones and remove duplicates