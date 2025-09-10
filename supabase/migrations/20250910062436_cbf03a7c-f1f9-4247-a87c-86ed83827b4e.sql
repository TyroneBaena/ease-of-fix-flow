-- Create default budget categories for the organization
INSERT INTO public.budget_categories (id, name, description, organization_id, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'General Maintenance', 'General maintenance and repair work', 'aebcc3ab-5aa6-4c82-a075-a7d130866a12'::uuid, now(), now()),
  (gen_random_uuid(), 'Plumbing', 'Plumbing repairs and installations', 'aebcc3ab-5aa6-4c82-a075-a7d130866a12'::uuid, now(), now()),
  (gen_random_uuid(), 'Electrical', 'Electrical repairs and installations', 'aebcc3ab-5aa6-4c82-a075-a7d130866a12'::uuid, now(), now()),
  (gen_random_uuid(), 'HVAC', 'Heating, ventilation, and air conditioning', 'aebcc3ab-5aa6-4c82-a075-a7d130866a12'::uuid, now(), now()),
  (gen_random_uuid(), 'Landscaping', 'Garden and outdoor maintenance', 'aebcc3ab-5aa6-4c82-a075-a7d130866a12'::uuid, now(), now()),
  (gen_random_uuid(), 'Cleaning', 'Cleaning and janitorial services', 'aebcc3ab-5aa6-4c82-a075-a7d130866a12'::uuid, now(), now()),
  (gen_random_uuid(), 'Security', 'Security systems and access control', 'aebcc3ab-5aa6-4c82-a075-a7d130866a12'::uuid, now(), now()),
  (gen_random_uuid(), 'Emergency Repairs', 'Urgent repairs and emergency maintenance', 'aebcc3ab-5aa6-4c82-a075-a7d130866a12'::uuid, now(), now())
ON CONFLICT (id) DO NOTHING;