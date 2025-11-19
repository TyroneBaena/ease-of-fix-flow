-- Clean up orphaned subscriber record for goyalsunny19986@gmail.com
-- This record was left behind when the user was deleted but subscribers table wasn't included
DELETE FROM subscribers 
WHERE email = 'goyalsunny19986@gmail.com'
AND user_id = 'c5b048b4-a26e-45a6-b262-d8f9e77414b4';