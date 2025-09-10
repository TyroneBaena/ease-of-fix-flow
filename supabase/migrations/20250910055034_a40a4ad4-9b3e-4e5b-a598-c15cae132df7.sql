-- Clean up duplicate contractor records by keeping only the most recent one for each user
WITH duplicate_contractors AS (
  SELECT 
    user_id,
    id,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC, id DESC) as rn
  FROM contractors
  WHERE user_id IN (
    SELECT user_id 
    FROM contractors 
    GROUP BY user_id 
    HAVING COUNT(*) > 1
  )
),
contractors_to_delete AS (
  SELECT id, user_id
  FROM duplicate_contractors 
  WHERE rn > 1
)
-- First, update any references in maintenance_requests to point to the kept contractor
UPDATE maintenance_requests 
SET contractor_id = (
  SELECT c.id 
  FROM contractors c 
  WHERE c.user_id = (
    SELECT user_id 
    FROM contractors 
    WHERE id = maintenance_requests.contractor_id
  )
  ORDER BY c.created_at DESC 
  LIMIT 1
)
WHERE contractor_id IN (SELECT id FROM contractors_to_delete);

-- Update any references in quotes to point to the kept contractor
UPDATE quotes 
SET contractor_id = (
  SELECT c.id 
  FROM contractors c 
  WHERE c.user_id = (
    SELECT user_id 
    FROM contractors 
    WHERE id = quotes.contractor_id
  )
  ORDER BY c.created_at DESC 
  LIMIT 1
)
WHERE contractor_id IN (SELECT id FROM contractors_to_delete);

-- Update any references in invoices to point to the kept contractor
UPDATE invoices 
SET contractor_id = (
  SELECT c.id 
  FROM contractors c 
  WHERE c.user_id = (
    SELECT user_id 
    FROM contractors 
    WHERE id = invoices.contractor_id
  )
  ORDER BY c.created_at DESC 
  LIMIT 1
)
WHERE contractor_id IN (SELECT id FROM contractors_to_delete);

-- Update any references in job_schedules to point to the kept contractor
UPDATE job_schedules 
SET contractor_id = (
  SELECT c.id 
  FROM contractors c 
  WHERE c.user_id = (
    SELECT user_id 
    FROM contractors 
    WHERE id = job_schedules.contractor_id
  )
  ORDER BY c.created_at DESC 
  LIMIT 1
)
WHERE contractor_id IN (SELECT id FROM contractors_to_delete);

-- Update any references in job_scheduling_history to point to the kept contractor
UPDATE job_scheduling_history 
SET contractor_id = (
  SELECT c.id 
  FROM contractors c 
  WHERE c.user_id = (
    SELECT user_id 
    FROM contractors 
    WHERE id = job_scheduling_history.contractor_id
  )
  ORDER BY c.created_at DESC 
  LIMIT 1
)
WHERE contractor_id IN (SELECT id FROM contractors_to_delete);

-- Update any references in quote_logs to point to the kept contractor
UPDATE quote_logs 
SET contractor_id = (
  SELECT c.id 
  FROM contractors c 
  WHERE c.user_id = (
    SELECT user_id 
    FROM contractors 
    WHERE id = quote_logs.contractor_id
  )
  ORDER BY c.created_at DESC 
  LIMIT 1
)
WHERE contractor_id IN (SELECT id FROM contractors_to_delete);

-- Now delete the duplicate contractor records
DELETE FROM contractors 
WHERE id IN (SELECT id FROM contractors_to_delete);

-- Add a unique constraint to prevent future duplicates
ALTER TABLE contractors ADD CONSTRAINT contractors_user_id_unique UNIQUE (user_id);