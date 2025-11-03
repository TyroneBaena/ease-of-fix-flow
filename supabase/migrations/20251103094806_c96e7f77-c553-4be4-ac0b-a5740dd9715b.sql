-- Set statement timeout to prevent runaway queries
-- This will abort any query that takes longer than 15 seconds at the DATABASE level
-- This is different from client-side AbortSignal which doesn't stop the actual query

ALTER DATABASE postgres SET statement_timeout = '15s';

-- Also set it for the current session to take effect immediately
SET statement_timeout = '15s';

-- Note: This setting will apply to all queries in the database
-- If you have legitimate long-running queries, they will also be affected
-- You can increase this value if needed, but 15s is reasonable for OLTP workloads