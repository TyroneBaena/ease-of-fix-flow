
-- Create activity_logs table to store timeline events
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'quote_requested', 'quote_submitted', 'contractor_assigned', etc.
  description TEXT NOT NULL,
  actor_name TEXT, -- Name of person who performed the action
  actor_role TEXT, -- Role of person who performed the action
  metadata JSONB, -- Additional data like contractor info, amounts, etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy for admins to view all activity logs
CREATE POLICY "Admins can view all activity logs" 
  ON public.activity_logs 
  FOR SELECT 
  USING (get_current_user_role() = 'admin');

-- Policy for managers to view all activity logs
CREATE POLICY "Managers can view all activity logs" 
  ON public.activity_logs 
  FOR SELECT 
  USING (get_current_user_role() = 'manager');

-- Policy for users to view activity logs for their requests
CREATE POLICY "Users can view activity logs for their requests" 
  ON public.activity_logs 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.maintenance_requests 
    WHERE id = activity_logs.request_id AND user_id = auth.uid()
  ));

-- Policy for contractors to view activity logs for their assigned requests
CREATE POLICY "Contractors can view activity logs for assigned requests" 
  ON public.activity_logs 
  FOR SELECT 
  USING (is_contractor_user() AND EXISTS (
    SELECT 1 FROM public.maintenance_requests 
    WHERE id = activity_logs.request_id AND contractor_id = get_contractor_id()
  ));

-- Policy for admins and managers to insert activity logs
CREATE POLICY "Admins and managers can insert activity logs" 
  ON public.activity_logs 
  FOR INSERT 
  WITH CHECK (get_current_user_role() IN ('admin', 'manager'));

-- Policy for contractors to insert activity logs for their requests
CREATE POLICY "Contractors can insert activity logs for their requests" 
  ON public.activity_logs 
  FOR INSERT 
  WITH CHECK (is_contractor_user() AND EXISTS (
    SELECT 1 FROM public.maintenance_requests 
    WHERE id = activity_logs.request_id AND contractor_id = get_contractor_id()
  ));

-- Create index for better performance
CREATE INDEX idx_activity_logs_request_id ON public.activity_logs(request_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at);
