-- Create a new test contractor invitation
SELECT supabase.functions.invoke('invite-contractor', 
  json_build_object(
    'email', 'newcontractor@test.com',
    'companyName', 'Test Construction Co',
    'contactName', 'John Contractor',
    'phone', '+1234567890',
    'address', '123 Main St, Test City',
    'specialties', ARRAY['Plumbing', 'Electrical']
  )
);