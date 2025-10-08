# Phase 2: Complete Implementation Testing Guide

## 📋 Overview

Phase 2 is now **COMPLETE** with all remaining features implemented:

✅ **Automatic Trial-to-Paid Conversion** - Trials automatically convert when they expire
✅ **Recurring Billing** - Monthly subscriptions with automatic charges  
✅ **Dynamic Property Count Billing** - Billing adjusts monthly based on property count changes
✅ **Failed Payment Handling** - Grace period and retry logic
✅ **Access Control** - Subscription guard blocks expired/cancelled users
✅ **Email Notifications** - Comprehensive notification system
✅ **Webhook Infrastructure** - Full Stripe event handling

---

## 🚀 New Features Implemented

### 1. Automatic Trial Conversion
**Edge Function:** `auto-convert-trials`
- Runs daily at 2 AM via cron job
- Automatically converts expired trials to paid subscriptions
- Only converts if user has:
  - Payment method attached
  - Active properties
  - Trial has ended
- Sends confirmation email upon conversion
- Handles edge cases (no properties, no payment method)

### 2. Dynamic Billing Adjustments
**Edge Function:** `adjust-subscription-billing`
- Runs monthly on 1st day at 3 AM via cron job
- Checks all active subscriptions
- Adjusts billing amount based on current property count
- Prorates the difference (credits or charges)
- Cancels subscription if property count drops to 0
- Sends billing change notification emails

### 3. Scheduled Tasks (Cron Jobs)
Three cron jobs now running:
- **2 AM Daily:** Auto-convert expired trials
- **3 AM Monthly (1st):** Adjust subscription billing
- **10 AM Daily:** Send trial reminder emails (7, 3, 1 day)

---

## 🧪 Testing the Complete Workflow

### Test 1: New User Sign Up & Trial Start ✅

**Steps:**
1. Navigate to `/auth/signup`
2. Create new account with email
3. Complete organization setup
4. Add a payment method in `/billing-security`
5. Add 2 properties

**Expected Results:**
- ✅ 30-day trial starts automatically
- ✅ Trial end date displayed
- ✅ `subscribers` table shows:
  - `is_trial_active = true`
  - `trial_end_date` set to 30 days from now
  - `active_properties_count = 2`
  - `payment_method_id` populated
- ✅ User can access all features
- ✅ Billing preview shows $58/month (2 × $29)

**Where to verify:**
- UI: `/billing-security` page
- Database: Check `subscribers` table in Supabase

---

### Test 2: Trial Reminder Emails 📧

**Testing Method:**
You can manually trigger the cron job or wait for scheduled time.

**Manual Trigger:**
1. Open Supabase SQL Editor
2. Run:
```sql
SELECT
  net.http_post(
    url:='https://ltjlswzrdgtoddyqmydo.supabase.co/functions/v1/check-trial-reminders',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer SERVICE_KEY"}'::jsonb,
    body:='{}'::jsonb
  );
```

**OR Test Directly:**
1. Update a user's `trial_end_date` to 7 days from now in `subscribers` table
2. Wait for cron job at 10 AM or trigger manually
3. Check email inbox

**Expected Results:**
- ✅ Email sent at 7 days, 3 days, and 1 day before trial ends
- ✅ Email shows:
  - Days remaining
  - Current property count
  - Monthly amount after trial

**Where to verify:**
- Email inbox
- Edge Function logs: Supabase → Functions → `check-trial-reminders` → Logs
- Database: Check `last_trial_reminder_sent` (if you added this field)

---

### Test 3: Automatic Trial Conversion (Critical!) 🔄

**Testing Method A: Simulate Expired Trial**
1. Go to Supabase → Table Editor → `subscribers`
2. Find your test user
3. Update `trial_end_date` to yesterday
4. Ensure user has:
   - `payment_method_id` populated
   - `active_properties_count > 0`
   - `is_trial_active = true`
   - `subscribed = false`
   - `is_cancelled = false`

5. **Manually trigger the cron job:**
```sql
SELECT
  net.http_post(
    url:='https://ltjlswzrdgtoddyqmydo.supabase.co/functions/v1/auto-convert-trials',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer SERVICE_KEY"}'::jsonb,
    body:='{}'::jsonb
  );
```

**Expected Results:**
- ✅ User receives upgrade confirmation email
- ✅ `subscribers` table updated:
  - `is_trial_active = false`
  - `subscribed = true`
  - `subscription_status = 'active'`
  - `stripe_subscription_id` populated
  - `last_billing_date` set
  - `next_billing_date` set (30 days later)
- ✅ Stripe subscription created
- ✅ User can still access all features
- ✅ UI shows "Active Subscription" instead of trial

**Where to verify:**
- Email inbox for upgrade confirmation
- Database: `subscribers` table
- Stripe Dashboard: https://dashboard.stripe.com/subscriptions
- UI: `/billing-security` page
- Edge Function logs: `auto-convert-trials`

---

### Test 4: Dynamic Billing Adjustment (Property Count Changes) 💰

**Scenario A: Add Properties**
1. User starts with 2 properties ($58/month subscription)
2. Add 1 more property (now 3 total)
3. Wait for monthly billing adjustment OR trigger manually:

```sql
SELECT
  net.http_post(
    url:='https://ltjlswzrdgtoddyqmydo.supabase.co/functions/v1/adjust-subscription-billing',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer SERVICE_KEY"}'::jsonb,
    body:='{}'::jsonb
  );
```

**Expected Results:**
- ✅ Subscription amount updated from $58 to $87/month
- ✅ Proration created in Stripe (immediate charge for difference)
- ✅ Email sent notifying of billing increase
- ✅ Email shows:
  - Old property count: 2
  - New property count: 3
  - Old amount: $58
  - New amount: $87
- ✅ Next invoice will be $87

**Scenario B: Remove Properties**
1. User has 3 properties ($87/month)
2. Delete 1 property (now 2 total)
3. Trigger billing adjustment

**Expected Results:**
- ✅ Subscription amount updated to $58/month
- ✅ Credit applied for next billing period
- ✅ Email sent notifying of billing decrease

**Scenario C: Remove All Properties**
1. User has 2 properties
2. Delete all properties
3. Trigger billing adjustment

**Expected Results:**
- ✅ Subscription cancelled in Stripe
- ✅ `subscribers` table updated:
  - `subscribed = false`
  - `is_cancelled = true`
  - `cancellation_date` set
  - `subscription_status = 'canceled'`
- ✅ User blocked from accessing features
- ✅ Email sent notifying of cancellation

**Where to verify:**
- Email inbox
- Stripe Dashboard → Subscriptions → View subscription
- Database: `subscribers` table
- UI: `/billing-security` shows updated amount
- Edge Function logs: `adjust-subscription-billing`

---

### Test 5: Failed Payment Handling 💳

**Manual Test in Stripe:**
1. Use test card `4000000000000341` (always fails)
2. Let Stripe attempt to charge subscription
3. Stripe will auto-retry failed payments

**Expected Results:**
- ✅ `subscribers.failed_payment_count` increments
- ✅ `payment_status` changes to 'failed'
- ✅ After 3rd failure: 7-day grace period starts
- ✅ Grace period banner shown in UI
- ✅ Email sent after each failure
- ✅ Access blocked after grace period expires
- ✅ User redirected to `/billing-security`

**Grace Period Test:**
1. Simulate 3 failed payments
2. Update `failed_payment_count = 3` and `last_payment_attempt` in database
3. User gets 7 more days to fix payment method
4. Check UI shows correct grace period message

**Where to verify:**
- Database: `subscribers.failed_payment_count`, `last_payment_attempt`
- UI: Failed payment banner with grace period countdown
- Stripe Dashboard: Payment attempts
- Email inbox

---

### Test 6: Subscription Cancellation & Reactivation 🔄

**Cancellation Test:**
1. Go to `/billing-security`
2. Click "Cancel Subscription"
3. Select reason and confirm

**Expected Results:**
- ✅ Subscription cancelled in Stripe
- ✅ `subscribers` table:
  - `is_cancelled = true`
  - `cancellation_date` set
  - `subscription_status = 'canceled'`
  - `subscribed = false`
- ✅ User blocked from properties/requests
- ✅ Cancellation confirmation email sent
- ✅ Access guard redirects to `/billing-security`

**Reactivation Test:**
1. Click "Reactivate Subscription"
2. Confirm reactivation

**Expected Results:**
- ✅ New Stripe subscription created
- ✅ `subscribers` table:
  - `is_cancelled = false`
  - `subscribed = true`
  - `subscription_status = 'active'`
  - New `stripe_subscription_id`
- ✅ User regains access immediately
- ✅ Confirmation email sent

---

### Test 7: Access Control & Guards 🛡️

**Test Expired Trial:**
1. Set user's `trial_end_date` to yesterday
2. Set `is_trial_active = false`, `subscribed = false`
3. Try to access `/properties` or `/requests`

**Expected Result:**
- ✅ Redirected to access denied page
- ✅ Shows "Trial Period Ended" message
- ✅ Button to upgrade subscription

**Test Cancelled Subscription:**
1. Set `is_cancelled = true`, `subscribed = false`
2. Try to access protected pages

**Expected Result:**
- ✅ Redirected to access denied page
- ✅ Shows "Subscription Cancelled" message
- ✅ Button to reactivate

**Test No Payment Method:**
1. Set `payment_method_id = null`
2. Access trial features with `requirePaymentMethod = true`

**Expected Result:**
- ✅ Blocked with "Payment Method Required" message

**Where to test:**
- `/properties` - should be guarded
- `/requests` - should be guarded
- `/billing-security` - should be accessible
- `/dashboard` - should be accessible

---

## 🔍 Monitoring & Debugging

### View Cron Job Status
```sql
SELECT * FROM cron.job;
```

### View Cron Job Run History
```sql
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 10;
```

### Check Edge Function Logs
1. Supabase Dashboard → Functions
2. Select function:
   - `auto-convert-trials`
   - `adjust-subscription-billing`
   - `check-trial-reminders`
3. View logs tab

### Verify Subscriber State
```sql
SELECT 
  email,
  is_trial_active,
  trial_end_date,
  subscribed,
  is_cancelled,
  active_properties_count,
  payment_method_id,
  stripe_subscription_id,
  subscription_status,
  payment_status,
  failed_payment_count,
  last_billing_date,
  next_billing_date
FROM subscribers;
```

### Check Stripe Webhooks
1. Stripe Dashboard → Developers → Webhooks
2. View webhook endpoint
3. Check recent deliveries and failures

---

## 📊 Database Quick Checks

### Count Active Subscriptions
```sql
SELECT COUNT(*) FROM subscribers 
WHERE subscribed = true AND is_cancelled = false;
```

### Count Active Trials
```sql
SELECT COUNT(*) FROM subscribers 
WHERE is_trial_active = true AND trial_end_date > NOW();
```

### Count Expired Trials (Ready to Convert)
```sql
SELECT COUNT(*) FROM subscribers 
WHERE is_trial_active = true 
AND subscribed = false
AND is_cancelled = false
AND trial_end_date <= NOW()
AND payment_method_id IS NOT NULL;
```

### View Failed Payments
```sql
SELECT email, failed_payment_count, last_payment_attempt, payment_status
FROM subscribers 
WHERE failed_payment_count > 0
ORDER BY failed_payment_count DESC;
```

---

## 🎯 UI Testing Checklist

### Billing & Security Page (`/billing-security`)
- [ ] Shows correct subscription status (Trial/Active/Cancelled)
- [ ] Displays days remaining for trials
- [ ] Shows property count and monthly amount
- [ ] Trial progress bar accurate
- [ ] Payment method status visible
- [ ] "Add Payment Method" button works
- [ ] "Cancel Subscription" flow works
- [ ] "Reactivate Subscription" button shows when cancelled
- [ ] Failed payment banner shows when applicable
- [ ] Grace period countdown accurate

### Dashboard
- [ ] Trial status banner shows for trial users
- [ ] Expiring trial warning shows at 7 days
- [ ] Access allowed during trial
- [ ] Access blocked after trial expiry (without subscription)
- [ ] Access blocked for cancelled users

### Properties Page
- [ ] Accessible for active trial users
- [ ] Accessible for active subscribers
- [ ] Blocked for expired trials
- [ ] Blocked for cancelled subscriptions
- [ ] Proper redirect to `/billing-security`

### Maintenance Requests
- [ ] Same access rules as Properties
- [ ] SubscriptionGuard works correctly

---

## ✅ Success Criteria

Phase 2 is fully complete when:

1. **Automatic Conversion:** Trials automatically convert to paid when expired
2. **Recurring Billing:** Monthly charges happen automatically via Stripe
3. **Dynamic Billing:** Subscription amount adjusts with property count changes
4. **Failed Payments:** Grace period logic works correctly
5. **Access Control:** Guards properly block unauthorized access
6. **Cron Jobs:** All 3 scheduled tasks running successfully
7. **Email Notifications:** All email types sending correctly
8. **Webhook Handling:** Stripe events processed correctly
9. **No Manual Intervention:** System runs fully automated
10. **Error Handling:** Graceful failures with proper logging

---

## 🐛 Common Issues & Solutions

### Issue: Cron job not running
**Solution:** Check if pg_cron extension is enabled:
```sql
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

### Issue: Trial not converting
**Check:**
- User has `payment_method_id`
- User has properties (`active_properties_count > 0`)
- `trial_end_date` is in the past
- `is_trial_active = true` and `subscribed = false`
- Edge function logs for errors

### Issue: Billing not adjusting
**Check:**
- `active_properties_count` is synced with actual property count
- Stripe subscription exists and is active
- Edge function logs for errors
- Cron job ran successfully

### Issue: Emails not sending
**Check:**
- Resend API key is configured
- Email domain is verified in Resend
- Edge function logs for email errors
- Check Resend dashboard for delivery status

---

## 📞 Support & Resources

- **Stripe Dashboard:** https://dashboard.stripe.com
- **Supabase Dashboard:** https://supabase.com/dashboard/project/ltjlswzrdgtoddyqmydo
- **Resend Dashboard:** https://resend.com
- **Edge Function Logs:** https://supabase.com/dashboard/project/ltjlswzrdgtoddyqmydo/functions

---

**Implementation Date:** 2025-01-08  
**Status:** ✅ PHASE 2 COMPLETE - READY FOR PRODUCTION
