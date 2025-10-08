# 📧 EMAIL CONFIGURATION REQUIRED

## ⚠️ CRITICAL: Email Sending Currently Disabled

Your application's email system requires domain verification to function properly.

---

## 🔧 **What Needs to Be Done**

### Step 1: Verify Your Domain on Resend

All email functions are configured to send from `@housinghub.app` domain. You need to verify this domain (or use your own custom domain) on Resend.

**Go to:** https://resend.com/domains

1. Click "Add Domain"
2. Enter your domain: `housinghub.app` (or your custom domain)
3. Follow the DNS verification steps provided by Resend
4. Wait for verification (usually takes a few minutes)

### Step 2: Ensure NEW_RESEND_API_KEY is Set

The following Edge Functions require `NEW_RESEND_API_KEY` environment variable:

✅ Already configured for these functions:
- `send-trial-reminder`
- `check-trial-reminders` 
- `send-upgrade-confirmation`
- `send-comment-notification`
- `send-maintenance-request-notification`
- `send-quote-notification`
- `send-invoice-notification`
- `send-job-completion-notification`
- `invite-contractor`
- `send-landlord-report`

**Verify the secret is set:**
1. Go to: https://supabase.com/dashboard/project/ltjlswzrdgtoddyqmydo/settings/functions
2. Confirm `NEW_RESEND_API_KEY` is listed in Edge Function secrets
3. If missing, add it with your Resend API key from https://resend.com/api-keys

---

## 📨 **Email Functions Status**

| Function | Domain | Status | Priority |
|----------|--------|--------|----------|
| Trial Reminders | @housinghub.app | ❌ Not Working | HIGH |
| Upgrade Confirmations | @housinghub.app | ❌ Not Working | HIGH |
| Maintenance Notifications | @housinghub.app | ❌ Not Working | MEDIUM |
| Comment Notifications | @housinghub.app | ❌ Not Working | LOW |
| Quote Notifications | @housinghub.app | ❌ Not Working | MEDIUM |
| Invoice Notifications | @housinghub.app | ❌ Not Working | MEDIUM |
| Job Completion | @housinghub.app | ❌ Not Working | MEDIUM |
| Contractor Invites | @housinghub.app | ❌ Not Working | MEDIUM |
| Landlord Reports | @housinghub.app | ❌ Not Working | MEDIUM |

---

## 🚀 **Quick Test After Setup**

Once domain is verified, test email sending:

```bash
curl -X POST \
  "https://ltjlswzrdgtoddyqmydo.supabase.co/functions/v1/test-signup-email" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0amxzd3pyZGd0b2RkeXFteWRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDU0MDk5MiwiZXhwIjoyMDYwMTE2OTkyfQ.BLQ5g9hPWdNcWfSBALa5wE2_5qVdYJV7sQjfmUgV0t4" \
  -d '{"test_email": "your-email@example.com"}'
```

Expected response:
```json
{
  "success": true,
  "message": "Test email sent successfully"
}
```

---

## 🔄 **Alternative: Use Your Own Domain**

If you prefer to use your own domain instead of `housinghub.app`:

1. Search and replace all instances of `@housinghub.app` in `supabase/functions/` directory
2. Replace with `@yourdomain.com`
3. Verify your domain on Resend
4. Redeploy edge functions

---

## ⏰ **Impact on Phase 2 Billing**

Until emails are configured:
- ✅ Trial conversions still work (Stripe integration functional)
- ❌ Trial reminders won't be sent (7, 3, 1 day warnings)
- ❌ Upgrade confirmation emails won't be sent
- ❌ Payment receipt emails won't be sent

**The billing system will work, but users won't receive email notifications.**

---

## 📞 **Need Help?**

- Resend Documentation: https://resend.com/docs
- Resend Support: https://resend.com/support
- Supabase Edge Functions: https://supabase.com/docs/guides/functions

---

**Status:** ⏳ Awaiting domain verification on Resend
