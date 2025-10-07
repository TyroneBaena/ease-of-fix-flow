# Signup Flow Fix - Stripe Customer Creation

## Problem Identified

When users signed up for a new account, **NO Stripe customer was being created** because the signup flow was missing the trial subscription creation step.

### Previous Flow (BROKEN)
1. ✅ User signs up → email confirmation sent
2. ✅ User confirms email → logs in
3. ✅ User creates organization → becomes admin
4. ❌ **MISSING STEP** → User redirected directly to dashboard
5. ❌ **NO STRIPE CUSTOMER CREATED**

### Root Cause
- After organization creation, users were redirected to `/dashboard`
- They never went through the `/billing` page where trial setup happens
- The `create-trial-subscription` edge function was never called
- No Stripe customer record was created

## Solution Implemented

Updated the signup flow to redirect to the billing page after organization setup.

### New Flow (FIXED)
1. ✅ User signs up → email confirmation sent
2. ✅ User confirms email → logs in
3. ✅ User creates organization → becomes admin
4. ✅ **NEW: User redirected to `/billing`**
5. ✅ **User starts trial → Stripe customer created**

### Files Modified

1. **src/pages/Signup.tsx**
   - Changed `handleOrganizationComplete()` to redirect to `/billing` instead of `/dashboard`

2. **src/components/auth/OrganizationOnboarding.tsx**
   - Added `useNavigate` hook
   - Changed redirect after organization creation from calling `onComplete()` to navigating to `/billing`

## How to Test

### Test with New User Signup

1. **Sign up a new user**
   - Go to `/signup`
   - Enter email, password, and name
   - Click "Sign up"

2. **Confirm email**
   - Check your email inbox
   - Click the confirmation link
   - You'll be logged in automatically

3. **Create organization**
   - You'll see the "Complete Your Setup" page
   - Enter organization name (e.g., "Test Organization 99")
   - Click "Create Organization"

4. **Start trial (NEW STEP)**
   - You should now be redirected to `/billing`
   - You'll see the "Billing & Subscription" page
   - Click "Start Free Trial" button
   - This will create the Stripe customer

5. **Verify in Stripe**
   - Go to your Stripe dashboard
   - Navigate to Customers
   - You should see the new customer with the user's email

### Verify Database Records

After signup, check these tables:

```sql
-- Check subscriber record
SELECT * FROM subscribers WHERE email = 'your-test-email@example.com';

-- Should show:
-- - stripe_customer_id (populated)
-- - is_trial_active (true)
-- - trial_start_date and trial_end_date (set)
```

## Expected Results

### In Application
- User completes signup and organization setup smoothly
- User is guided to billing page to start trial
- Trial starts successfully with clear confirmation message

### In Stripe Dashboard
- New customer created with user's email
- Customer has associated SetupIntent for payment method
- Customer metadata includes user_id and organization info

### In Database
- `subscribers` table has complete record
- `stripe_customer_id` is populated
- Trial dates are set correctly
- `active_properties_count` is 0 initially

## Migration Path for Existing Users

For users who signed up before this fix (like `lefomi@forexzig.com`):

1. They already have an account and organization
2. They can navigate to `/billing` manually
3. They can click "Start Free Trial" to create their Stripe customer
4. System will create subscriber record and Stripe customer retroactively

## Debugging Steps

If a new user signup doesn't create a Stripe customer:

1. **Check Console Logs**
   - Look for redirect to `/billing` after organization creation
   - Check for any errors during trial creation

2. **Check Edge Function Logs**
   - Go to Supabase → Edge Functions → `create-trial-subscription`
   - Look for recent invocations with the user's email

3. **Check Database**
   ```sql
   -- Verify subscriber record
   SELECT * FROM subscribers WHERE user_id = 'user-uuid';
   
   -- Check organization membership
   SELECT * FROM user_organizations WHERE user_id = 'user-uuid';
   ```

4. **Check Stripe Dashboard**
   - Customers → Search by email
   - Should see customer with SetupIntent

## Next Steps

This fix resolves the critical issue where new signups weren't creating Stripe customers. The next phase should focus on:

1. **Payment Method Collection** (Phase 1 - already implemented)
   - Users must add payment method before trial starts
   - Validate payment method exists before trial activation

2. **Subscription Guard** (Phase 1 - already implemented)
   - Block access to properties when trial expires
   - Block access for cancelled subscriptions

3. **Trial to Paid Conversion** (Future)
   - Automatic conversion at trial end
   - Handle payment failures gracefully
