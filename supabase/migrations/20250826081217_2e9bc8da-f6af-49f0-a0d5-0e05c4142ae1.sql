-- Clean up remaining duplicate contractor policies
DROP POLICY IF EXISTS "Allow contractors to view requests assigned to them" ON maintenance_requests;
DROP POLICY IF EXISTS "Contractors can update assigned maintenance requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Contractors can view assigned maintenance requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Contractors can view requests they can quote on" ON maintenance_requests;
DROP POLICY IF EXISTS "maintenance_requests_contractor_select" ON maintenance_requests;
DROP POLICY IF EXISTS "maintenance_requests_contractor_update" ON maintenance_requests;

-- Also drop the "Admin full access" policy since we have the unified ones now
DROP POLICY IF EXISTS "Admin full access to maintenance requests" ON maintenance_requests;