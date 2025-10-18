-- Test the launch_simulation function step by step
-- First, let's see if we can call it with test data

SELECT launch_simulation(
  'e5d3f78b-329d-4a73-b2ed-8eed5a361f23'::uuid,  -- template_id
  'Test Simulation'::text,  -- name
  120::integer,  -- duration_minutes
  ARRAY['9591f0d7-86c5-4786-a137-9be83d66ca71'::uuid],  -- participant_user_ids (just one for testing)
  ARRAY['student'::text]  -- participant_roles
);
