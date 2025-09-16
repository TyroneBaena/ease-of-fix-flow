-- First, remove the contractor assignment from Request 1 to avoid security violation
-- Then fix the organization context
DO $$
DECLARE
    john_org_id UUID;
    user_id_john UUID;
    javascript_contractor_id UUID;
BEGIN
    -- Get john constructions organization ID
    SELECT id INTO john_org_id 
    FROM organizations 
    WHERE name = 'john constructions';
    
    -- Get the user ID for muluwi@forexzig.com
    SELECT id INTO user_id_john
    FROM profiles 
    WHERE email = 'muluwi@forexzig.com';
    
    IF john_org_id IS NOT NULL AND user_id_john IS NOT NULL THEN
        -- First, remove contractor assignment from Request 1
        UPDATE maintenance_requests 
        SET contractor_id = NULL, assigned_at = NULL
        WHERE title = 'Request 1' 
        AND user_id = user_id_john;
        
        -- Now update Request 1 to be in john constructions organization
        UPDATE maintenance_requests 
        SET organization_id = john_org_id 
        WHERE title = 'Request 1' 
        AND user_id = user_id_john;
        
        -- Get the javascript contractor from john constructions org
        SELECT id INTO javascript_contractor_id
        FROM contractors 
        WHERE company_name = 'Javascript' 
        AND organization_id = john_org_id;
        
        -- Re-assign contractor if found
        IF javascript_contractor_id IS NOT NULL THEN
            UPDATE maintenance_requests 
            SET contractor_id = javascript_contractor_id, assigned_at = now()
            WHERE title = 'Request 1' 
            AND user_id = user_id_john
            AND organization_id = john_org_id;
        END IF;
        
        -- Also create a property for john constructions if none exists
        IF NOT EXISTS (SELECT 1 FROM properties WHERE organization_id = john_org_id) THEN
            INSERT INTO properties (
                name,
                address,
                contact_number,
                email,
                practice_leader,
                practice_leader_phone,
                practice_leader_email,
                user_id,
                organization_id,
                created_at,
                updated_at
            ) VALUES (
                'John Constructions Main Office',
                '123 Construction Ave, BuildCity',
                '+1-555-CONSTRUCT',
                'office@johnconstructions.com',
                'John Smith',
                '+1-555-JOHN-CEO',
                'john@johnconstructions.com',
                user_id_john,
                john_org_id,
                now(),
                now()
            );
        END IF;
        
        RAISE NOTICE 'Fixed Request 1 organization context and contractor assignment for john constructions';
    ELSE
        RAISE NOTICE 'Could not find john constructions organization or user';
    END IF;
END $$;