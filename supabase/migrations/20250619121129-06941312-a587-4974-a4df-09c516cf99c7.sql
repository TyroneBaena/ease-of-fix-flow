
-- Create the job_schedules table to store scheduled jobs
CREATE TABLE public.job_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  scheduled_dates JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS)
ALTER TABLE public.job_schedules ENABLE ROW LEVEL SECURITY;

-- Create policy for contractors to view their own scheduled jobs
CREATE POLICY "Contractors can view their own scheduled jobs" 
  ON public.job_schedules 
  FOR SELECT 
  USING (contractor_id = public.get_contractor_id());

-- Create policy for contractors to create their own scheduled jobs
CREATE POLICY "Contractors can create their own scheduled jobs" 
  ON public.job_schedules 
  FOR INSERT 
  WITH CHECK (contractor_id = public.get_contractor_id());

-- Create policy for contractors to update their own scheduled jobs
CREATE POLICY "Contractors can update their own scheduled jobs" 
  ON public.job_schedules 
  FOR UPDATE 
  USING (contractor_id = public.get_contractor_id());

-- Create policy for admins to view all scheduled jobs
CREATE POLICY "Admins can view all scheduled jobs" 
  ON public.job_schedules 
  FOR SELECT 
  USING (public.is_admin());

-- Create policy for managers to view scheduled jobs for their properties
CREATE POLICY "Managers can view scheduled jobs for their properties" 
  ON public.job_schedules 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.maintenance_requests mr
      JOIN public.properties p ON mr.property_id = p.id
      WHERE mr.id = job_schedules.request_id
      AND (
        p.user_id = auth.uid() OR
        public.user_has_property_access(p.id)
      )
    )
  );
