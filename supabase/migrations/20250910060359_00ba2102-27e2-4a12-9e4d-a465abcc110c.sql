-- Clean up duplicate contractor records (constraint already exists)
-- Step 1: Create temporary table with contractors to keep
CREATE TEMP TABLE contractors_to_keep AS
SELECT DISTINCT ON (user_id) id
FROM contractors
ORDER BY user_id, created_at DESC, id DESC;

-- Step 2: Update all foreign key references to point to the kept contractors
UPDATE maintenance_requests 
SET contractor_id = (
  SELECT ctk.id 
  FROM contractors_to_keep ctk
  JOIN contractors c ON ctk.id = c.id
  WHERE c.user_id = (
    SELECT user_id 
    FROM contractors 
    WHERE id = maintenance_requests.contractor_id
  )
)
WHERE contractor_id NOT IN (SELECT id FROM contractors_to_keep)
AND contractor_id IS NOT NULL;

UPDATE quotes 
SET contractor_id = (
  SELECT ctk.id 
  FROM contractors_to_keep ctk
  JOIN contractors c ON ctk.id = c.id
  WHERE c.user_id = (
    SELECT user_id 
    FROM contractors 
    WHERE id = quotes.contractor_id
  )
)
WHERE contractor_id NOT IN (SELECT id FROM contractors_to_keep);

UPDATE invoices 
SET contractor_id = (
  SELECT ctk.id 
  FROM contractors_to_keep ctk
  JOIN contractors c ON ctk.id = c.id
  WHERE c.user_id = (
    SELECT user_id 
    FROM contractors 
    WHERE id = invoices.contractor_id
  )
)
WHERE contractor_id NOT IN (SELECT id FROM contractors_to_keep);

UPDATE job_schedules 
SET contractor_id = (
  SELECT ctk.id 
  FROM contractors_to_keep ctk
  JOIN contractors c ON ctk.id = c.id
  WHERE c.user_id = (
    SELECT user_id 
    FROM contractors 
    WHERE id = job_schedules.contractor_id
  )
)
WHERE contractor_id NOT IN (SELECT id FROM contractors_to_keep);

UPDATE job_scheduling_history 
SET contractor_id = (
  SELECT ctk.id 
  FROM contractors_to_keep ctk
  JOIN contractors c ON ctk.id = c.id
  WHERE c.user_id = (
    SELECT user_id 
    FROM contractors 
    WHERE id = job_scheduling_history.contractor_id
  )
)
WHERE contractor_id NOT IN (SELECT id FROM contractors_to_keep);

UPDATE quote_logs 
SET contractor_id = (
  SELECT ctk.id 
  FROM contractors_to_keep ctk
  JOIN contractors c ON ctk.id = c.id
  WHERE c.user_id = (
    SELECT user_id 
    FROM contractors 
    WHERE id = quote_logs.contractor_id
  )
)
WHERE contractor_id NOT IN (SELECT id FROM contractors_to_keep);

-- Step 3: Delete duplicate contractor records
DELETE FROM contractors 
WHERE id NOT IN (SELECT id FROM contractors_to_keep);