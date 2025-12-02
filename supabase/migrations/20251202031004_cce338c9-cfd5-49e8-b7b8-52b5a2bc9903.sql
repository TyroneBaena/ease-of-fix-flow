-- Move pg_net extension from public schema to extensions schema
-- This resolves the security linter warning about extensions in public schema

-- Step 1: Drop the existing extension (CASCADE will drop dependent objects in net schema)
DROP EXTENSION IF EXISTS pg_net CASCADE;

-- Step 2: Recreate pg_net in the extensions schema
CREATE EXTENSION pg_net WITH SCHEMA extensions;

-- Step 3: Grant usage on net schema to required roles
-- pg_net always creates its own 'net' schema for its functions regardless of extension location
GRANT USAGE ON SCHEMA net TO postgres, anon, authenticated, service_role;

-- Step 4: Grant execute on net functions to service_role (needed for database functions)
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA net TO postgres, service_role;