-- Add organization_code column to organizations table for Phase 3
ALTER TABLE public.organizations 
ADD COLUMN organization_code TEXT UNIQUE;

-- Add an index for better performance
CREATE INDEX idx_organizations_code ON public.organizations(organization_code);

-- Generate unique organization codes for existing organizations
DO $$
DECLARE
    org_record RECORD;
    code_attempt TEXT;
    counter INTEGER;
BEGIN
    FOR org_record IN SELECT id, name, slug FROM public.organizations ORDER BY created_at LOOP
        counter := 0;
        LOOP
            -- Generate code based on organization name with counter
            code_attempt := UPPER(SUBSTR(REGEXP_REPLACE(org_record.name, '[^a-zA-Z0-9]', '', 'g'), 1, 6)) || 
                           LPAD(counter::TEXT, 2, '0');
            
            -- If code is too short, pad with random suffix
            IF LENGTH(code_attempt) < 4 THEN
                code_attempt := code_attempt || SUBSTR(MD5(org_record.id::TEXT), 1, 4);
            END IF;
            
            -- Try to update with this code
            UPDATE public.organizations 
            SET organization_code = code_attempt 
            WHERE id = org_record.id AND organization_code IS NULL;
            
            -- If successful, exit loop
            IF FOUND THEN
                RAISE NOTICE 'Set code % for organization %', code_attempt, org_record.name;
                EXIT;
            END IF;
            
            counter := counter + 1;
            
            -- Safety break to prevent infinite loop
            IF counter > 100 THEN
                RAISE EXCEPTION 'Could not generate unique code for organization %', org_record.name;
            END IF;
        END LOOP;
    END LOOP;
END $$;

-- Make organization_code NOT NULL after setting values
ALTER TABLE public.organizations 
ALTER COLUMN organization_code SET NOT NULL;