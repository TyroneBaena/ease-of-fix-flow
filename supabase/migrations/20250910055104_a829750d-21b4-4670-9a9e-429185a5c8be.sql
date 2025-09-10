-- Clean up duplicate contractor records by keeping only the most recent one for each user
-- Step 1: Create temporary table with contractors to keep
CREATE TEMP TABLE contractors_to_keep AS
SELECT DISTINCT ON (user_id) id
FROM contractors
ORDER BY user_id, created_at DESC, id DESC;

-- Step 2: Update maintenance_requests references
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
WHERE contractor_id NOT IN (SELECT id FROM contractors_to_keep);

-- Step 3: Update quotes references
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

-- Step 4: Update invoices references
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

-- Step 5: Update job_schedules references
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

-- Step 6: Update job_scheduling_history references
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

-- Step 7: Update quote_logs references
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

-- Step 8: Delete duplicate contractor records
DELETE FROM contractors 
WHERE id NOT IN (SELECT id FROM contractors_to_keep);

-- Step 9: Add unique constraint to prevent future duplicates
ALTER TABLE contractors ADD CONSTRAINT contractors_user_id_unique UNIQUE (user_id);