-- Fix organization context for existing "Request 1" to be associated with john constructions
-- First, get the organization ID for john constructions
DO $$
DECLARE
    john_org_id UUID;
    user_id_john UUID;
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
        -- Update Request 1 to be in john constructions organization
        UPDATE maintenance_requests 
        SET organization_id = john_org_id 
        WHERE title = 'Request 1' 
        AND user_id = user_id_john;
        
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
        
        RAISE NOTICE 'Updated Request 1 organization context and created property for john constructions';
    ELSE
        RAISE NOTICE 'Could not find john constructions organization or user';
    END IF;
END $$;