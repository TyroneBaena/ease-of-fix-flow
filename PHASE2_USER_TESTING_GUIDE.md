# 🧪 Phase 2 User Testing Guide - Step by Step

## Welcome! 👋

This guide will help you test the complete Phase 2 billing automation system. Follow these steps to verify everything is working correctly.

---

## ✅ Prerequisites

Before you start testing:
- [ ] You have access to an admin account
- [ ] Stripe is configured and connected
- [ ] Resend email is configured
- [ ] You can access the Supabase dashboard

---

## 📱 How to Access the UI

### Main Testing Page:
**Navigate to:** `/billing-security`

This page shows:
- Your subscription status
- Trial information (if on trial)
- Property count and billing details
- Payment method status
- Admin-only testing panel (at the bottom for admins)

---

## 🧪 Test Scenarios

### Scenario 1: Sign Up and Start Trial (15 minutes)

**Goal:** Verify new users can sign up and start a 30-day trial

**Steps:**
1. **Sign Up**
   - Go to `/auth/signup`
   - Enter email and password
   - Verify email if required
   - Create organization

2. **Check Trial Status**
   - Navigate to `/billing-security`
   - You should see:
     - ✅ "Trial Active" badge
     - ✅ Days remaining (should show ~30)
     - ✅ Trial end date
     - ✅ Message: "Add payment method to continue after trial"

3. **Add Properties**
   - Go to `/properties`
   - Click "Add Property"
   - Add 2-3 test properties

4. **Check Billing Preview**
   - Return to `/billing-security`
   - Scroll to "Billing Preview" section
   - Verify it shows:
     - ✅ Property count matches
     - ✅ Monthly amount = Properties × $29
     - ✅ "After trial ends" message

5. **Add Payment Method**
   - Click "Add Payment Method" button
   - Use Stripe test card: `4242 4242 4242 4242`
   - Any future date, any CVC
   - Complete the setup
   - Verify payment method badge changes to "✅ Active"

**Success Criteria:**
- ✅ Trial is active for 30 days
- ✅ Property count is tracked
- ✅ Billing amount calculated correctly
- ✅ Payment method saved successfully
- ✅ Can access all features during trial

---

### Scenario 2: Trial Expiration & Auto-Conversion (Manual Testing)

**Goal:** Test automatic conversion of expired trials

**⚠️ IMPORTANT:** This normally happens automatically at 2 AM daily, but we'll simulate it for testing.

**Steps:**

1. **Simulate Expired Trial** (Admin Access Required)
   - Go to [Supabase Dashboard → Table Editor](https://supabase.com/dashboard/project/ltjlswzrdgtoddyqmydo/editor)
   - Open `subscribers` table
   - Find your test user's row
   - Click "Edit" on that row
   - Change `trial_end_date` to yesterday's date (e.g., if today is Jan 8, set to Jan 7)
   - Save changes

2. **Trigger Auto-Conversion** (Admin Only)
   - Go to `/billing-security`
   - Scroll down to "Phase 2: Automated Billing Testing Panel" (admin only)
   - Click "Auto-Convert Trials" button
   - Wait for the process to complete (~10 seconds)
   - Check the results shown

3. **Verify Conversion**
   - Refresh the page
   - Check that:
     - ✅ Trial badge is gone
     - ✅ "Active Subscription" badge appears
     - ✅ Monthly billing amount is shown
     - ✅ Next billing date is ~30 days from now

4. **Check Email**
   - Look for upgrade confirmation email
   - Should contain:
     - ✅ Welcome message
     - ✅ Property count
     - ✅ Monthly billing amount
     - ✅ Next billing date

5. **Verify in Stripe**
   - Go to [Stripe Dashboard](https://dashboard.stripe.com/subscriptions)
   - Find your subscription
   - Verify:
     - ✅ Status is "Active"
     - ✅ Amount matches (properties × $29)
     - ✅ Billing interval is "monthly"

**Success Criteria:**
- ✅ Trial auto-converted to paid subscription
- ✅ Email confirmation received
- ✅ Stripe subscription created
- ✅ User retains access to all features
- ✅ Database updated correctly

---

### Scenario 3: Add/Remove Properties (Dynamic Billing)

**Goal:** Test that billing adjusts automatically when property count changes

**Steps:**

1. **Add a Property**
   - Note current property count (e.g., 2 properties = $58/month)
   - Go to `/properties`
   - Click "Add Property"
   - Fill in details and save
   - Return to `/billing-security`
   - Property count should update

2. **Trigger Billing Adjustment** (Admin)
   - Scroll to testing panel
   - Click "Adjust Billing" button
   - Wait for completion
   - Check results

3. **Verify Billing Update**
   - Refresh `/billing-security`
   - Check:
     - ✅ Property count increased (now 3)
     - ✅ Monthly amount updated ($87/month)
     - ✅ Message about billing change

4. **Check Email Notification**
   - Look for billing change email
   - Should show:
     - ✅ Old property count (2)
     - ✅ New property count (3)
     - ✅ Old amount ($58)
     - ✅ New amount ($87)
     - ✅ Explanation of proration

5. **Verify in Stripe**
   - Check subscription in Stripe
   - Look for:
     - ✅ Updated subscription amount
     - ✅ Proration invoice (if mid-cycle)
     - ✅ Next invoice amount is correct

6. **Test Removing Properties**
   - Delete one property
   - Trigger billing adjustment again
   - Verify amount decreases

**Success Criteria:**
- ✅ Billing updates when properties added
- ✅ Billing updates when properties removed
- ✅ Email notifications sent
- ✅ Stripe subscriptions updated with proration
- ✅ Changes reflected in UI immediately

---

### Scenario 4: Trial Reminder Emails

**Goal:** Test that users receive reminders before trial ends

**Testing Options:**

**Option A: Simulate (Quick)**
1. Go to Supabase → Table Editor → `subscribers`
2. Set your `trial_end_date` to 7 days from today
3. Go to `/billing-security` admin panel
4. Click "Trial Reminders" button
5. Check email inbox for 7-day reminder

**Option B: Production Schedule (Slow)**
1. Set `trial_end_date` to 7, 3, or 1 day from today
2. Wait for 10 AM (when cron job runs)
3. Check email

**Email Should Contain:**
- ✅ Days remaining in trial
- ✅ Current property count
- ✅ Amount they'll be charged ($XX/month)
- ✅ Link to add payment method
- ✅ Personalized greeting

**Success Criteria:**
- ✅ Reminder sent at 7 days before expiry
- ✅ Reminder sent at 3 days before expiry
- ✅ Reminder sent at 1 day before expiry
- ✅ Emails contain accurate information
- ✅ Users receive emails on time

---

### Scenario 5: Subscription Cancellation & Reactivation

**Goal:** Test cancellation and reactivation flows

**Cancellation Steps:**
1. Go to `/billing-security`
2. Scroll to bottom, click "Cancel Subscription"
3. Select a cancellation reason
4. Click "Confirm Cancellation"
5. Wait for process to complete

**Verify Cancellation:**
- ✅ UI shows "Cancelled" badge
- ✅ Access to features blocked
- ✅ Trying to access `/properties` redirects you
- ✅ Cancellation email received
- ✅ Stripe subscription shows as "Cancelled"

**Reactivation Steps:**
1. Still on `/billing-security`
2. Click "Reactivate Subscription" button
3. Confirm reactivation
4. Wait for process

**Verify Reactivation:**
- ✅ UI shows "Active" badge
- ✅ Access restored immediately
- ✅ Can access `/properties` and `/requests`
- ✅ New Stripe subscription created
- ✅ Billing amount matches property count
- ✅ Confirmation email received

**Success Criteria:**
- ✅ Cancellation works smoothly
- ✅ Access properly restricted
- ✅ Reactivation works without issues
- ✅ Billing resumes correctly
- ✅ Emails sent for both actions

---

### Scenario 6: Failed Payment & Grace Period

**Goal:** Test failed payment handling and grace period

**⚠️ Use Stripe Test Card for Failed Payments**

**Steps:**

1. **Set Up Failed Payment**
   - In Stripe, update payment method to: `4000 0000 0000 0341` (always declines)
   - OR: Remove payment method entirely
   - Wait for next billing cycle

2. **Trigger Failed Payment** (Manual in Stripe)
   - Go to Stripe Dashboard
   - Find your subscription
   - Click "..." → "Update subscription" → "Charge customer now"
   - Payment will fail

3. **Verify Failed Payment**
   - Check `/billing-security`
   - Should see:
     - ✅ Red "Payment Failed" banner
     - ✅ "Update Payment Method" button
     - ✅ Failure count shown

4. **Test Grace Period** (After 3 Failures)
   - Simulate 3 failed payments
   - Update database: `failed_payment_count = 3`
   - Check UI shows:
     - ✅ "Grace Period" banner
     - ✅ Days remaining in grace period (7 days)
     - ✅ Urgent message to update payment

5. **Update Payment Method**
   - Click "Update Payment Method"
   - Add valid test card: `4242 4242 4242 4242`
   - Verify:
     - ✅ Failed payment count resets to 0
     - ✅ Banner disappears
     - ✅ Subscription remains active

**Success Criteria:**
- ✅ Failed payments tracked correctly
- ✅ UI shows appropriate warnings
- ✅ Grace period activates after 3 failures
- ✅ Access maintained during grace period
- ✅ Access blocked after grace period expires
- ✅ Fixing payment method restores everything

---

## 🔧 Admin Testing Panel

**Location:** `/billing-security` (bottom of page, admin only)

### Available Actions:

1. **Auto-Convert Trials**
   - Manually trigger trial conversion check
   - Shows which users were converted
   - Displays any errors or skipped users

2. **Adjust Billing**
   - Manually trigger monthly billing adjustment
   - Shows billing changes made
   - Displays property count updates

3. **Trial Reminders**
   - Manually trigger reminder email check
   - Shows who received reminders
   - Displays days remaining for each

4. **Check Cron Jobs**
   - View status of all scheduled tasks
   - Shows schedule and active status
   - Verifies cron jobs are running

### How to Use:
1. Scroll to bottom of `/billing-security`
2. You'll see the "Phase 2: Automated Billing Testing Panel"
3. Click any button to trigger that process
4. Wait for completion (usually 5-15 seconds)
5. Review results displayed below the buttons

---

## 📊 Checking the Database

### View Subscriber Status
1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/ltjlswzrdgtoddyqmydo/editor)
2. Click "Table Editor"
3. Open `subscribers` table
4. Find your user
5. Check fields:
   - `is_trial_active` - Should be true/false based on status
   - `subscribed` - True if active subscription
   - `active_properties_count` - Should match actual property count
   - `trial_end_date` - 30 days from trial start
   - `next_billing_date` - Next charge date
   - `payment_method_id` - Should be populated if added
   - `stripe_subscription_id` - Populated when subscribed

### View Cron Jobs
Run this query in SQL Editor:
```sql
SELECT jobname, schedule, active 
FROM cron.job 
ORDER BY jobname;
```

Should show:
- `auto-convert-expired-trials` - Daily at 2 AM
- `adjust-monthly-billing` - Monthly on 1st at 3 AM  
- `send-trial-reminders` - Daily at 10 AM

---

## 📧 Expected Emails

You should receive these emails during testing:

1. **Trial Started**
   - Sent: When you sign up
   - Contains: Trial end date, property info

2. **Trial Reminder (7 days)**
   - Sent: 7 days before trial ends
   - Contains: Reminder, billing amount

3. **Trial Reminder (3 days)**
   - Sent: 3 days before trial ends
   - Contains: Urgent reminder

4. **Trial Reminder (1 day)**
   - Sent: 1 day before trial ends
   - Contains: Final reminder

5. **Trial Converted to Paid**
   - Sent: When trial auto-converts
   - Contains: Welcome, billing info

6. **Billing Adjusted**
   - Sent: When property count changes
   - Contains: Old/new amounts

7. **Payment Failed**
   - Sent: When payment fails
   - Contains: Update payment method link

8. **Subscription Cancelled**
   - Sent: When you cancel
   - Contains: Cancellation confirmation

9. **Subscription Reactivated**
   - Sent: When you reactivate
   - Contains: Welcome back message

---

## ✅ Final Checklist

After completing all tests, verify:

- [ ] Trial system works (30 days, payment method)
- [ ] Auto-conversion works (trial → paid)
- [ ] Billing adjusts with property changes
- [ ] Reminder emails send at correct times
- [ ] Failed payments handled properly
- [ ] Grace period logic works
- [ ] Cancellation blocks access
- [ ] Reactivation restores access
- [ ] All emails received correctly
- [ ] Admin testing panel works
- [ ] Cron jobs are scheduled
- [ ] Database updates correctly
- [ ] Stripe subscriptions created
- [ ] UI reflects all changes

---

## 🐛 Troubleshooting

### "Cron jobs not running"
- Check: `SELECT * FROM pg_extension WHERE extname = 'pg_cron';`
- Should show pg_cron is installed

### "Trial not converting"
- Verify user has payment method
- Check property count > 0
- Confirm trial_end_date is past
- Check edge function logs

### "Billing not adjusting"
- Verify property count synced
- Check Stripe subscription exists
- Review edge function logs
- Confirm cron job ran

### "Emails not sending"
- Verify Resend API key configured
- Check email domain verified
- Review edge function logs for errors

### "Can't access testing panel"
- Must be logged in as admin
- Check user role in `profiles` table
- Refresh page after role change

---

## 📚 Additional Resources

- **Stripe Dashboard:** https://dashboard.stripe.com
- **Supabase Dashboard:** https://supabase.com/dashboard/project/ltjlswzrdgtoddyqmydo
- **Resend Dashboard:** https://resend.com
- **Edge Function Logs:** Supabase → Functions → Select Function → Logs tab

---

## 🎉 You're Done!

If all tests pass, Phase 2 is working correctly! The system will now:
- ✅ Automatically convert trials to paid subscriptions
- ✅ Adjust billing monthly based on property count
- ✅ Send reminder emails before trial expiry
- ✅ Handle failed payments with grace periods
- ✅ Block access when subscriptions expire or are cancelled

Everything runs automatically - no manual intervention needed!

---

**Questions?** Check the detailed testing guide in `PHASE2_COMPLETE_TESTING_GUIDE.md` for technical details.
