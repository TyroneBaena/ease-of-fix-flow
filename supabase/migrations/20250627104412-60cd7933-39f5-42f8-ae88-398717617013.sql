
-- Create a table to store job scheduling history/logs
CREATE TABLE public.job_scheduling_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'scheduled', 'rescheduled', 'cancelled'
  scheduled_dates JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_by UUID NOT NULL, -- user who performed the action
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS)
ALTER TABLE public.job_scheduling_history ENABLE ROW LEVEL SECURITY;

-- Create policy for contractors to view their own scheduling history
CREATE POLICY "Contractors can view their own scheduling history" 
  ON public.job_scheduling_history 
  FOR SELECT 
  USING (contractor_id = public.get_contractor_id());

-- Create policy for contractors to create their own scheduling history
CREATE POLICY "Contractors can create their own scheduling history" 
  ON public.job_scheduling_history 
  FOR INSERT 
  WITH CHECK (contractor_id = public.get_contractor_id());

-- Create policy for admins to view all scheduling history
CREATE POLICY "Admins can view all scheduling history" 
  ON public.job_scheduling_history 
  FOR SELECT 
  USING (public.is_admin());

-- Create policy for managers to view scheduling history for their properties
CREATE POLICY "Managers can view scheduling history for their properties" 
  ON public.job_scheduling_history 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.maintenance_requests mr
      JOIN public.properties p ON mr.property_id = p.id
      WHERE mr.id = job_scheduling_history.request_id
      AND (
        p.user_id = auth.uid() OR
        public.user_has_property_access(p.id)
      )
    )
  );

-- Create index for better query performance
CREATE INDEX idx_job_scheduling_history_request_id ON public.job_scheduling_history(request_id);
CREATE INDEX idx_job_scheduling_history_contractor_id ON public.job_scheduling_history(contractor_id);
CREATE INDEX idx_job_scheduling_history_created_at ON public.job_scheduling_history(created_at DESC);
