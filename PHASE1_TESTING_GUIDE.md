# Phase 1 Implementation Testing Guide

## ✅ What Was Implemented

### 1. Access Control Middleware (`useSubscriptionGuard` Hook)
- **Location**: `src/hooks/useSubscriptionGuard.tsx`
- **Purpose**: Blocks access for users with expired/cancelled subscriptions
- **Features**:
  - Checks if trial has expired
  - Checks if subscription is cancelled
  - Checks if user has no active subscription
  - Shows toast notifications with action buttons
  - Returns access status and loading state

### 2. Subscription Guard Component
- **Location**: `src/components/billing/SubscriptionGuard.tsx`
- **Purpose**: Wraps protected features and redirects unauthorized users
- **Features**:
  - Loading state with spinner
  - Different access denied messages based on reason
  - Redirects to billing page
  - Beautiful UI for access restriction messages

### 3. Payment Method Setup Component
- **Location**: `src/components/auth/PaymentMethodSetup.tsx`
- **Purpose**: Requires payment method before activating trial
- **Features**:
  - Stripe Elements integration
  - SetupIntent creation
  - Payment method validation
  - Success/error handling
  - No charge until trial ends messaging

### 4. Payment Method Validation Edge Function
- **Location**: `supabase/functions/validate-payment-method/index.ts`
- **Purpose**: Server-side payment method validation
- **Features**:
  - Checks if customer has payment method in Stripe
  - Updates subscriber record with payment_method_id
  - Returns payment method details

### 5. Protected Routes Integration
- **Updated**: `src/pages/Properties.tsx`
- **Feature**: Wrapped Properties page with SubscriptionGuard
- **Effect**: Users without valid subscription cannot access properties

---

## 🧪 How to Test in the UI

### Test 1: New User Signup with Payment Method

**Expected Flow:**
1. User signs up → Required to add payment method
2. Payment method added → Trial starts automatically
3. User gets access to properties and features
4. No charge during 30-day trial

**Steps:**
1. Navigate to `/signup`
2. Fill in signup form (name, email, password)
3. Enter test credit card:
   - **Card Number**: `4242 4242 4242 4242`
   - **Expiry**: Any future date (e.g., `12/25`)
   - **CVC**: Any 3 digits (e.g., `123`)
   - **ZIP**: Any 5 digits (e.g., `12345`)
4. Click "Sign Up & Start Trial"
5. Wait for success message
6. Verify you're redirected to dashboard
7. Check billing page shows trial status

**Expected Results:**
- ✅ Trial starts immediately
- ✅ Payment method saved (shown in billing page)
- ✅ 30 days remaining displayed
- ✅ No charge posted to Stripe

**Verification:**
```sql
-- Check subscriber record
SELECT 
  email,
  is_trial_active,
  trial_start_date,
  trial_end_date,
  payment_method_id,
  stripe_customer_id
FROM subscribers 
WHERE email = 'your-test-email@example.com';
```

---

### Test 2: Access Control - Trial Expired

**Setup:**
1. Manually expire a trial in the database:
```sql
UPDATE subscribers 
SET trial_end_date = NOW() - INTERVAL '1 day',
    is_trial_active = false,
    subscribed = false
WHERE email = 'test-expired@example.com';
```

**Steps:**
1. Log in as the test user
2. Try to navigate to `/properties`
3. Should see access restricted message

**Expected Results:**
- ❌ Cannot access properties page
- ✅ See "Trial Expired" message
- ✅ "Upgrade Now" button visible
- ✅ Clicking button redirects to `/billing`

---

### Test 3: Access Control - Cancelled Subscription

**Setup:**
1. Cancel a subscription:
```sql
UPDATE subscribers 
SET is_cancelled = true,
    cancellation_date = NOW()
WHERE email = 'test-cancelled@example.com';
```

**Steps:**
1. Log in as the test user
2. Try to access properties
3. Should see access restricted

**Expected Results:**
- ❌ Cannot access properties
- ✅ See "Subscription Cancelled" message
- ✅ "Reactivate" button visible
- ✅ Redirects to billing page

---

### Test 4: Access Control - No Subscription

**Setup:**
1. Create user without subscription:
```sql
DELETE FROM subscribers WHERE email = 'test-nosubscription@example.com';
```

**Steps:**
1. Log in as user
2. Navigate to properties page
3. Should be blocked

**Expected Results:**
- ❌ Cannot access properties
- ✅ See "Subscription Required" message
- ✅ "Start Free Trial" button visible

---

### Test 5: Payment Method Validation Edge Function

**Test via Supabase Functions:**
1. Go to Supabase Dashboard > Functions
2. Find `validate-payment-method`
3. Send test request:

```bash
curl -X POST \
  https://ltjlswzrdgtoddyqmydo.supabase.co/functions/v1/validate-payment-method \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "has_payment_method": true,
  "payment_method": {
    "brand": "visa",
    "last4": "4242",
    "exp_month": 12,
    "exp_year": 2025
  }
}
```

---

### Test 6: Subscription Guard Loading State

**Steps:**
1. Log in
2. Navigate to properties quickly
3. Should see loading spinner briefly

**Expected Results:**
- ✅ Loading spinner displays while checking subscription
- ✅ Content appears after validation
- ✅ No flashing/flickering

---

### Test 7: Toast Notifications

**Test Each Scenario:**

**Trial Expired:**
- Navigate to protected page with expired trial
- Toast should appear: "Trial Expired" with "Upgrade Now" action

**Subscription Cancelled:**
- Navigate with cancelled subscription
- Toast: "Subscription Cancelled" with "Reactivate" action

**No Subscription:**
- Navigate without subscription
- Toast: "Subscription Required" with "Start Free Trial" action

**Expected Results:**
- ✅ Toasts appear at top-right
- ✅ Action buttons work correctly
- ✅ Toasts auto-dismiss after 10 seconds
- ✅ Can manually dismiss

---

## 🔍 Manual Verification Checklist

### Database Verification

```sql
-- 1. Check if payment method is saved
SELECT 
  email,
  stripe_customer_id,
  payment_method_id,
  is_trial_active
FROM subscribers;

-- 2. Verify trial dates are correct (30 days)
SELECT 
  email,
  trial_start_date,
  trial_end_date,
  EXTRACT(DAY FROM (trial_end_date - trial_start_date)) as trial_days
FROM subscribers
WHERE is_trial_active = true;

-- 3. Check access control is enforced
SELECT 
  email,
  is_trial_active,
  subscribed,
  is_cancelled,
  trial_end_date < NOW() as trial_expired
FROM subscribers;
```

### Stripe Dashboard Verification

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/customers)
2. Find customer by email
3. Verify:
   - ✅ Customer exists
   - ✅ Payment method attached
   - ✅ SetupIntent succeeded
   - ✅ No charges posted

---

## 🐛 Common Issues & Solutions

### Issue 1: "Missing authorization header"
**Solution**: Ensure user is logged in before calling edge functions

### Issue 2: Payment setup fails
**Solution**: 
- Check Stripe keys are correct
- Verify test mode is active
- Try different test card

### Issue 3: Access still granted after trial expiry
**Solution**: 
- Clear browser cache
- Sign out and sign in again
- Verify database trial_end_date is in the past

### Issue 4: Toast not appearing
**Solution**:
- Check `<Toaster />` is in App.tsx
- Verify import: `import { toast } from 'sonner'`

---

## 📊 Success Metrics

**Phase 1 is successful if:**
- ✅ New signups require payment method
- ✅ Expired trials cannot access properties
- ✅ Cancelled subscriptions are blocked
- ✅ Payment methods are validated server-side
- ✅ Toast notifications work correctly
- ✅ Users can complete signup flow
- ✅ No charges during trial period

---

## 🚀 Next Steps (Phase 2)

Once Phase 1 testing is complete:
1. Implement Stripe Webhook Handler
2. Add trial-to-paid auto-conversion
3. Set up recurring billing
4. Add failed payment handling

---

## 📝 Test Results Template

### Date: _______________
### Tester: _______________

| Test | Status | Notes |
|------|--------|-------|
| Signup with Payment | ⬜ Pass / ⬜ Fail | |
| Trial Expired Block | ⬜ Pass / ⬜ Fail | |
| Cancelled Block | ⬜ Pass / ⬜ Fail | |
| No Subscription Block | ⬜ Pass / ⬜ Fail | |
| Payment Validation | ⬜ Pass / ⬜ Fail | |
| Loading States | ⬜ Pass / ⬜ Fail | |
| Toast Notifications | ⬜ Pass / ⬜ Fail | |

**Overall Phase 1 Status**: ⬜ PASS / ⬜ FAIL

**Issues Found**:
1. 
2. 
3. 

**Recommended Fixes**:
1. 
2. 
3.
