# Cron Job Workaround Setup Guide

## Problem Summary
Supabase's `pg_cron` extension is not reliably executing scheduled jobs despite being properly configured. Only 1 execution has been recorded out of 3 scheduled jobs.

## Solution: External Scheduling via GitHub Actions

Since Supabase's internal cron is unreliable, we've implemented an external scheduler using GitHub Actions as a workaround.

---

## Setup Instructions

### Step 1: Add Supabase Service Role Key to GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the following secret:
   - **Name:** `SUPABASE_SERVICE_ROLE_KEY`
   - **Value:** Your Supabase Service Role Key (found in Supabase Dashboard → Settings → API)
   
   **The key is:**
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0amxzd3pyZGd0b2RkeXFteWRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDU0MDk5MiwiZXhwIjoyMDYwMTE2OTkyfQ.BLQ5g9hPWdNcWfSBALa5wE2_5qVdYJV7sQjfmUgV0t4
   ```

### Step 2: Enable GitHub Actions

1. Ensure GitHub Actions are enabled in your repository:
   - Go to **Settings** → **Actions** → **General**
   - Under "Actions permissions", select **Allow all actions and reusable workflows**

2. The workflow file has been created at:
   ```
   .github/workflows/automated-billing-cron.yml
   ```

### Step 3: Verify Workflow is Active

1. Go to your repository's **Actions** tab
2. You should see "Automated Billing Cron Jobs" in the workflows list
3. The workflow will run automatically according to these schedules:
   - **Auto-convert trials:** Daily at 2:00 AM UTC
   - **Adjust subscription billing:** Monthly on 1st at 3:00 AM UTC
   - **Send trial reminders:** Daily at 10:00 AM UTC

---

## Manual Testing

### Option 1: Test via GitHub Actions UI (Recommended)

1. Go to **Actions** tab in your GitHub repository
2. Select "Automated Billing Cron Jobs" workflow
3. Click **Run workflow** button
4. Select which job to run:
   - `all` - Run all jobs
   - `auto-convert-trials` - Convert expired trials only
   - `adjust-subscription-billing` - Adjust billing only
   - `check-trial-reminders` - Send reminders only
5. Click **Run workflow**

### Option 2: Test via Manual Trigger Function

You can also trigger jobs using the new `manual-trigger-cron` edge function:

```bash
# Trigger all jobs
curl -X POST \
  "https://ltjlswzrdgtoddyqmydo.supabase.co/functions/v1/manual-trigger-cron" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -d '{"job": "all"}'

# Trigger specific job
curl -X POST \
  "https://ltjlswzrdgtoddyqmydo.supabase.co/functions/v1/manual-trigger-cron" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -d '{"job": "auto-convert-trials"}'

# Test mode (logs only, no actual changes)
curl -X POST \
  "https://ltjlswzrdgtoddyqmydo.supabase.co/functions/v1/manual-trigger-cron" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -d '{"job": "all", "test": true}'
```

### Option 3: Test Individual Functions Directly

```bash
# Test auto-convert-trials
curl -X POST \
  "https://ltjlswzrdgtoddyqmydo.supabase.co/functions/v1/auto-convert-trials" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -d '{"source": "manual-test"}'

# Test check-trial-reminders
curl -X POST \
  "https://ltjlswzrdgtoddyqmydo.supabase.co/functions/v1/check-trial-reminders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -d '{"source": "manual-test"}'

# Test adjust-subscription-billing
curl -X POST \
  "https://ltjlswzrdgtoddyqmydo.supabase.co/functions/v1/adjust-subscription-billing" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -d '{"source": "manual-test"}'
```

---

## Monitoring & Verification

### Check GitHub Actions Execution History

1. Go to **Actions** tab
2. Click on "Automated Billing Cron Jobs"
3. View execution history with timestamps and results
4. Failed runs will be marked in red with error details

### Check Supabase Edge Function Logs

1. Go to Supabase Dashboard → **Edge Functions**
2. Select the function you want to check
3. View logs for execution details and errors

### Verify Automation is Working

After setup, verify the system is working:

1. **Wait for scheduled execution** or trigger manually
2. **Check GitHub Actions** for successful runs
3. **Check Supabase logs** for function execution
4. **Verify database changes:**
   ```sql
   -- Check if trials are being converted
   SELECT email, is_trial_active, subscribed, updated_at 
   FROM subscribers 
   WHERE trial_end_date < NOW() 
   ORDER BY updated_at DESC;
   
   -- Check if reminders are being sent
   -- (Check Supabase edge function logs for send-trial-reminder)
   ```

---

## Schedule Details

| Job | GitHub Actions Schedule | Original pg_cron Schedule | Frequency |
|-----|------------------------|---------------------------|-----------|
| Auto-convert trials | `0 2 * * *` | `0 2 * * *` | Daily at 2 AM UTC |
| Adjust billing | `0 3 1 * *` | `0 3 1 * *` | Monthly on 1st at 3 AM UTC |
| Trial reminders | `0 10 * * *` | `0 10 * * *` | Daily at 10 AM UTC |

---

## Alternative Scheduling Options

If you prefer not to use GitHub Actions, you can use other external cron services:

### Option A: Cron-job.org (Free)
1. Sign up at https://cron-job.org
2. Create new cron job pointing to your edge functions
3. Set the same schedules as above

### Option B: EasyCron (Free tier available)
1. Sign up at https://www.easycron.com
2. Configure cron jobs for each function
3. Use service role key for authorization

### Option C: Your Own Server
If you have a server with cron capabilities:
```cron
# Add to crontab
0 2 * * * curl -X POST https://ltjlswzrdgtoddyqmydo.supabase.co/functions/v1/auto-convert-trials -H "Authorization: Bearer SERVICE_KEY"
0 3 1 * * curl -X POST https://ltjlswzrdgtoddyqmydo.supabase.co/functions/v1/adjust-subscription-billing -H "Authorization: Bearer SERVICE_KEY"
0 10 * * * curl -X POST https://ltjlswzrdgtoddyqmydo.supabase.co/functions/v1/check-trial-reminders -H "Authorization: Bearer SERVICE_KEY"
```

---

## Troubleshooting

### GitHub Actions Not Running

1. **Check repository permissions:**
   - Settings → Actions → General → Workflow permissions
   - Ensure "Read and write permissions" is selected

2. **Verify secret is set:**
   - Settings → Secrets and variables → Actions
   - Confirm `SUPABASE_SERVICE_ROLE_KEY` exists

3. **Check workflow syntax:**
   - Actions tab → Select workflow → Click on failed run
   - Review error messages

### Edge Functions Failing

1. **Check function logs in Supabase Dashboard**
2. **Verify service role key has correct permissions**
3. **Check for rate limiting or quota issues**
4. **Verify database connections are working**

### Still Want to Fix Supabase Cron?

If you want to continue trying to fix the native pg_cron:

1. **Contact Supabase Support:**
   - Dashboard → Support
   - Reference issue: "pg_cron jobs not executing despite being configured"
   - Provide job IDs: 1, 2, 3

2. **Check pg_cron extension version:**
   ```sql
   SELECT extversion FROM pg_extension WHERE extname = 'pg_cron';
   ```

3. **Verify cron jobs are active:**
   ```sql
   SELECT * FROM cron.job WHERE active = true;
   ```

4. **Check for execution logs:**
   ```sql
   SELECT * FROM cron.job_run_details ORDER BY runid DESC LIMIT 50;
   ```

---

## Migration Back to pg_cron (Future)

When Supabase fixes the cron execution issue:

1. **Disable GitHub Actions workflow:**
   - Either delete the workflow file
   - Or disable it in GitHub Actions settings

2. **Verify pg_cron is working:**
   ```sql
   SELECT * FROM cron.job_run_details 
   WHERE runid > 1 
   ORDER BY runid DESC;
   ```

3. **Keep the manual trigger function** as a backup for emergency use

---

## Summary

✅ **Immediate Solution:** GitHub Actions will now reliably trigger your billing automation  
✅ **Monitoring:** View execution history in GitHub Actions  
✅ **Testing:** Use manual trigger function or GitHub Actions UI  
✅ **Fallback:** Keep pg_cron configuration in place for future use  

**Next Steps:**
1. Add `SUPABASE_SERVICE_ROLE_KEY` to GitHub Secrets
2. Verify workflow appears in Actions tab
3. Manually trigger a test run
4. Monitor first scheduled execution
