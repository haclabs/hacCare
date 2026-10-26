-- create_snapshot, launch_run and reset_run belonged to the abandoned sim_*
-- "run" architecture. Every sim_* table they read and write is gone, so any call
-- failed. Their only caller (src/hooks/useSimulation.ts, used only by the
-- unrouted SimulationRunPage) is deleted in the same change. No trigger, policy,
-- view or other function referenced them; plain DROP (no CASCADE) so the
-- migration fails if that ever stops being true.
DROP FUNCTION public.create_snapshot(uuid, text, text);
DROP FUNCTION public.launch_run(uuid, text);
DROP FUNCTION public.reset_run(uuid);
