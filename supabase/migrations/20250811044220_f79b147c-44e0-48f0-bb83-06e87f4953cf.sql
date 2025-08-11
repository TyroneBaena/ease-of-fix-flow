
-- Add landlord assignment support to maintenance requests
ALTER TABLE public.maintenance_requests 
ADD COLUMN assigned_to_landlord boolean DEFAULT false,
ADD COLUMN landlord_notes text,
ADD COLUMN landlord_assigned_at timestamp with time zone,
ADD COLUMN landlord_assigned_by uuid REFERENCES auth.users(id);

-- Add activity log entry for landlord assignments
INSERT INTO public.activity_logs (request_id, action_type, description, actor_name, actor_role, metadata)
SELECT 
  id,
  'landlord_assignment',
  'Request assigned to landlord',
  'System',
  'admin',
  jsonb_build_object('assigned_at', now())
FROM public.maintenance_requests 
WHERE assigned_to_landlord = true;

-- Update RLS policies to include landlord assignment access
CREATE POLICY "Landlord can view assigned requests" 
ON public.maintenance_requests 
FOR SELECT 
USING (
  assigned_to_landlord = true AND 
  (get_current_user_role() = 'admin' OR get_current_user_role() = 'manager')
);
