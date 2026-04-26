-- ===========================================================================
-- Add folder column to simulation_templates
-- ===========================================================================
-- Adds a free-text folder label for organizing templates into logical groups
-- (e.g. "HOF CLS", "PN Fundamentals"). This is purely display/org metadata:
--   - Active simulations never reference this field (safe to change anytime)
--   - NULL = ungrouped (shown in an "Uncategorized" section)
--   - No FK / no enum — coordinators define whatever folder names make sense
-- ===========================================================================

ALTER TABLE simulation_templates
  ADD COLUMN IF NOT EXISTS folder TEXT DEFAULT NULL;

-- Index for fast group-by queries
CREATE INDEX IF NOT EXISTS idx_simulation_templates_folder
  ON simulation_templates (folder);

-- Comment for future devs
COMMENT ON COLUMN simulation_templates.folder IS
  'Optional display folder for organizing templates in the UI. No referential integrity — purely cosmetic. NULL = uncategorized.';
