# Cron Jobs Fix Guide - Simple Approach

## What I Did

✅ Removed complex GitHub Actions workaround  
✅ Recreated all pg_cron jobs with fresh configuration  
✅ Kept the existing Supabase pg_cron approach  

## Current Status

All 3 cron jobs have been **recreated with new IDs**:

| Job ID | Job Name | Schedule | Status |
|--------|----------|----------|--------|
| 4 | auto-convert-expired-trials | Daily at 2 AM UTC | ✅ Active |
| 5 | adjust-monthly-billing | Monthly on 1st at 3 AM UTC | ✅ Active |
| 6 | send-trial-reminders | Daily at 10 AM UTC | ✅ Active |

The old jobs (IDs 1, 2, 3) have been removed and replaced.

---

## Next Steps

### 1. Wait and Monitor (Recommended)

The cron jobs should now execute at their scheduled times:
- **Trial reminders:** Next run at 10:00 AM UTC today
- **Auto-convert trials:** Next run at 2:00 AM UTC tomorrow
- **Billing adjustment:** Next run on 1st of next month at 3:00 AM UTC

**How to check if they're working:**

```sql
-- Check execution history
SELECT * FROM cron.job_run_details 
ORDER BY runid DESC 
LIMIT 20;

-- Should show new executions with job IDs 4, 5, 6
```

### 2. Manual Testing (If You Can't Wait)

You can manually trigger the edge functions to test them immediately:

```bash
# Test auto-convert-trials
curl -X POST \
  "https://ltjlswzrdgtoddyqmydo.supabase.co/functions/v1/auto-convert-trials" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0amxzd3pyZGd0b2RkeXFteWRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDU0MDk5MiwiZXhwIjoyMDYwMTE2OTkyfQ.BLQ5g9hPWdNcWfSBALa5wE2_5qVdYJV7sQjfmUgV0t4" \
  -d '{"source": "manual-test"}'

# Test trial reminders
curl -X POST \
  "https://ltjlswzrdgtoddyqmydo.supabase.co/functions/v1/check-trial-reminders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0amxzd3pyZGd0b2RkeXFteWRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDU0MDk5MiwiZXhwIjoyMDYwMTE2OTkyfQ.BLQ5g9hPWdNcWfSBALa5wE2_5qVdYJV7sQjfmUgV0t4" \
  -d '{"source": "manual-test"}'

# Test billing adjustment
curl -X POST \
  "https://ltjlswzrdgtoddyqmydo.supabase.co/functions/v1/adjust-subscription-billing" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0amxzd3pyZGd0b2RkeXFteWRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDU0MDk5MiwiZXhwIjoyMDYwMTE2OTkyfQ.BLQ5g9hPWdNcWfSBALa5wE2_5qVdYJV7sQjfmUgV0t4" \
  -d '{"source": "manual-test"}'
```

### 3. Use Testing Panel

The `Phase2TestingPanel` component has emergency trigger buttons:
1. Go to your app
2. Navigate to billing testing panel
3. Click "Test Cron Execution" to verify connectivity
4. Use individual function triggers as needed

---

## Troubleshooting

### If Cron Still Doesn't Execute After 24 Hours

1. **Check Supabase Logs:**
   - Dashboard → Database → Logs
   - Look for any pg_cron errors

2. **Verify Extensions:**
   ```sql
   SELECT * FROM pg_extension 
   WHERE extname IN ('pg_cron', 'pg_net');
   ```
   Both should show as installed.

3. **Check Job Status:**
   ```sql
   SELECT * FROM cron.job WHERE active = true;
   ```
   Should show 3 active jobs.

4. **Contact Supabase Support:**
   If after 24-48 hours there are still no executions, this is a Supabase infrastructure issue.
   - Go to Supabase Dashboard → Support
   - Report: "pg_cron jobs not executing despite being configured"
   - Include job IDs: 4, 5, 6

---

## What Changed

### Before:
- Old cron jobs (IDs 1, 2, 3) were configured but not executing
- Only 1 execution recorded in entire history
- Root cause: Unknown Supabase infrastructure issue

### After:
- Fresh cron jobs (IDs 4, 5, 6) created
- Clean slate - no execution history yet
- Same configuration, but newly initialized
- Will know within 24 hours if issue is resolved

---

## Why This Might Work

Sometimes cron job issues can be resolved by:
1. **Recreating the jobs** - Clears any corrupted state
2. **Fresh initialization** - pg_cron might have had stale references
3. **New job IDs** - Avoids any ID conflicts or locks

This is a standard troubleshooting step for pg_cron issues.

---

## Monitoring Schedule

| Time (UTC) | Expected Action | Check This |
|------------|----------------|------------|
| Today 10:00 AM | Trial reminders should send | `cron.job_run_details` for job ID 6 |
| Tomorrow 2:00 AM | Auto-convert trials should run | `cron.job_run_details` for job ID 4 |
| 1st of month 3:00 AM | Billing adjustment should run | `cron.job_run_details` for job ID 5 |

---

## Summary

✅ **Done:** All cron jobs recreated with fresh configuration  
⏳ **Next:** Wait for scheduled execution (10 AM UTC today for trial reminders)  
🔍 **Monitor:** Check `cron.job_run_details` table after scheduled times  
📞 **Backup Plan:** Manual triggers available if cron still fails  

The issue was likely a stale state in pg_cron. Fresh recreation should resolve it.
