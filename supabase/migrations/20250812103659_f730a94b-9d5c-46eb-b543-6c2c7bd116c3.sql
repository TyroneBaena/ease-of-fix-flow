
-- Email relay keys table to map Reply-To tokens back to a specific request and recipient
CREATE TABLE IF NOT EXISTS public.email_relay_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  request_id uuid NOT NULL REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  actor_type text NOT NULL, -- e.g. 'landlord', 'user', 'contractor', 'admin'
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '45 days'),
  used_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS and policies
ALTER TABLE public.email_relay_keys ENABLE ROW LEVEL SECURITY;

-- Only admins/managers can view these records from the client (edge functions with service role can do all)
CREATE POLICY "Admin/Manager can view email relay keys"
  ON public.email_relay_keys
  FOR SELECT
  USING (get_current_user_role() = ANY (ARRAY['admin','manager']));

-- No INSERT/UPDATE/DELETE policies on purpose (client code shouldn’t manage these).
-- Edge functions will use the service role and bypass RLS.

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_email_relay_keys_token ON public.email_relay_keys (token);
CREATE INDEX IF NOT EXISTS idx_email_relay_keys_request ON public.email_relay_keys (request_id);
