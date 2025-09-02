-- Mark tenant_schemas table as deprecated and add final verification
-- Add comment to mark as deprecated
COMMENT ON TABLE public.tenant_schemas IS 'DEPRECATED: This table is no longer used. Multi-tenancy is now handled via organization_id in the organizations table. This table is kept for migration reference only.';

-- Create verification function for multi-tenancy health
CREATE OR REPLACE FUNCTION public.verify_multi_tenancy_health()
RETURNS TABLE(
  table_name TEXT,
  total_records BIGINT,
  records_with_org_id BIGINT,
  records_missing_org_id BIGINT,
  has_rls_policy BOOLEAN,
  health_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH table_stats AS (
    SELECT 'maintenance_requests'::TEXT as tbl, COUNT(*) as total, COUNT(organization_id) as with_org FROM maintenance_requests
    UNION ALL
    SELECT 'properties'::TEXT, COUNT(*) as total, COUNT(organization_id) as with_org FROM properties
    UNION ALL
    SELECT 'contractors'::TEXT, COUNT(*) as total, COUNT(organization_id) as with_org FROM contractors
    UNION ALL
    SELECT 'comments'::TEXT, COUNT(*) as total, COUNT(organization_id) as with_org FROM comments
    UNION ALL
    SELECT 'notifications'::TEXT, COUNT(*) as total, COUNT(organization_id) as with_org FROM notifications
  ),
  policy_check AS (
    SELECT DISTINCT 
      tablename as tbl,
      TRUE as has_policy
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND policyname LIKE '%organization%'
  )
  SELECT 
    ts.tbl::TEXT,
    ts.total,
    ts.with_org,
    (ts.total - ts.with_org) as missing,
    COALESCE(pc.has_policy, FALSE) as has_rls,
    CASE 
      WHEN ts.total = ts.with_org AND COALESCE(pc.has_policy, FALSE) THEN 'HEALTHY'
      WHEN ts.total != ts.with_org THEN 'MISSING_ORG_IDS'
      WHEN NOT COALESCE(pc.has_policy, FALSE) THEN 'MISSING_RLS_POLICY'
      ELSE 'UNKNOWN_ISSUE'
    END::TEXT as status
  FROM table_stats ts
  LEFT JOIN policy_check pc ON ts.tbl = pc.tbl
  ORDER BY ts.tbl;
END;
$function$;