-- First delete all quotes associated with contractors that have email contractor@test.com
DELETE FROM quotes WHERE contractor_id IN (
  SELECT id FROM contractors WHERE email = 'contractor@test.com'
);

-- Then delete the contractor records
DELETE FROM contractors WHERE email = 'contractor@test.com';