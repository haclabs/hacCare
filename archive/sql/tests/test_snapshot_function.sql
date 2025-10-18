-- Direct test: Call the function with a test template ID
-- Replace 'YOUR_TEMPLATE_ID' with your actual template ID

SELECT save_template_snapshot('68a3c8fc-59c4-4280-bf7f-d732add67938'::uuid);

-- This should return a JSON result like:
-- {"success": true, "template_id": "...", "snapshot_version": 1, "message": "..."}
