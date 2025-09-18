-- Fix critical data integrity issue: invoices with NULL organization_id
-- This is a security vulnerability allowing cross-organization data access

-- First, let's see the problematic invoices
DO $$
DECLARE
    invoice_record RECORD;
    request_org_id UUID;
BEGIN
    -- Fix each invoice with NULL organization_id by getting org from maintenance request
    FOR invoice_record IN 
        SELECT i.id, i.request_id 
        FROM invoices i 
        WHERE i.organization_id IS NULL
    LOOP
        -- Get organization_id from the maintenance request
        SELECT mr.organization_id INTO request_org_id
        FROM maintenance_requests mr 
        WHERE mr.id = invoice_record.request_id;
        
        IF request_org_id IS NOT NULL THEN
            -- Update the invoice with correct organization_id
            UPDATE invoices 
            SET organization_id = request_org_id,
                updated_at = NOW()
            WHERE id = invoice_record.id;
            
            RAISE LOG 'Fixed invoice % with organization_id %', invoice_record.id, request_org_id;
        ELSE
            RAISE LOG 'Could not determine organization for invoice %', invoice_record.id;
        END IF;
    END LOOP;
END $$;

-- Fix landlords with NULL organization_id
-- For now, we'll need to manually determine which organization they belong to
-- This is a data integrity issue that needs manual review

-- Add constraint to prevent future NULL organization_id in invoices
ALTER TABLE invoices 
ADD CONSTRAINT invoices_organization_id_not_null 
CHECK (organization_id IS NOT NULL);

-- Add constraint to prevent future NULL organization_id in landlords  
ALTER TABLE landlords 
ADD CONSTRAINT landlords_organization_id_not_null 
CHECK (organization_id IS NOT NULL);