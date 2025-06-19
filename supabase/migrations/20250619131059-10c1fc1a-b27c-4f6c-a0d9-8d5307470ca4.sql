
-- Create invoices table to store invoice information
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  final_cost DECIMAL(10,2) NOT NULL,
  gst_amount DECIMAL(10,2) NOT NULL,
  total_amount_with_gst DECIMAL(10,2) NOT NULL,
  invoice_file_url TEXT NOT NULL,
  invoice_file_name TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on invoices table
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for invoices
CREATE POLICY "Contractors can view their own invoices"
  ON public.invoices
  FOR SELECT
  USING (contractor_id = public.get_contractor_id());

CREATE POLICY "Contractors can insert their own invoices"
  ON public.invoices
  FOR INSERT
  WITH CHECK (contractor_id = public.get_contractor_id());

CREATE POLICY "Admins can view all invoices"
  ON public.invoices
  FOR ALL
  USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Managers can view all invoices"
  ON public.invoices
  FOR SELECT
  USING (public.get_current_user_role() = 'manager');

-- Create storage bucket for invoices
INSERT INTO storage.buckets (id, name, public) 
values ('invoices', 'invoices', false);

-- Create storage policies for invoices bucket
CREATE POLICY "Contractors can upload invoices"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'invoices' 
    AND public.is_contractor()
  );

CREATE POLICY "Contractors can view their invoices"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'invoices' 
    AND (
      public.is_contractor() 
      OR public.get_current_user_role() = 'admin' 
      OR public.get_current_user_role() = 'manager'
    )
  );

-- Add invoice_id column to maintenance_requests to link completed jobs with invoices
ALTER TABLE public.maintenance_requests 
ADD COLUMN invoice_id UUID REFERENCES public.invoices(id);
