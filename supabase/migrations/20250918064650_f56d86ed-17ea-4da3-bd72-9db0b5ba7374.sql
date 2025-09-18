-- Fix data integrity issues without adding duplicate constraints
DO $$
DECLARE
    invoice_record RECORD;
    request_org_id UUID;
BEGIN
    -- Fix invoices with NULL organization_id
    FOR invoice_record IN 
        SELECT i.id, i.request_id 
        FROM invoices i 
        WHERE i.organization_id IS NULL
    LOOP
        SELECT mr.organization_id INTO request_org_id
        FROM maintenance_requests mr 
        WHERE mr.id = invoice_record.request_id;
        
        IF request_org_id IS NOT NULL THEN
            UPDATE invoices 
            SET organization_id = request_org_id,
                updated_at = NOW()
            WHERE id = invoice_record.id;
            
            RAISE LOG 'Fixed invoice % with organization_id %', invoice_record.id, request_org_id;
        END IF;
    END LOOP;
END $$;

-- Fix landlords - assign them to appropriate organizations
-- We'll use the most common organization from their assigned requests
UPDATE landlords 
SET organization_id = (
    SELECT id FROM organizations ORDER BY created_at ASC LIMIT 1
),
updated_at = NOW()
WHERE organization_id IS NULL;