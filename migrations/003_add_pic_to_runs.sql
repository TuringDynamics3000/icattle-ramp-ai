-- Migration 003: Add PIC code to runs table
-- This links each run to a Property Identification Code

-- Add pic_code column to icattle_runs
ALTER TABLE icattle_runs
ADD COLUMN pic_code VARCHAR(8) REFERENCES pic_registry(pic_code);

-- Add index for querying runs by PIC
CREATE INDEX idx_runs_pic_code ON icattle_runs(pic_code);

-- Update existing runs to use the default site's PIC
UPDATE icattle_runs
SET pic_code = 'NSW12345'
WHERE pic_code IS NULL;

-- Make pic_code required for new runs (after backfill)
ALTER TABLE icattle_runs
ALTER COLUMN pic_code SET NOT NULL;

-- Add comment
COMMENT ON COLUMN icattle_runs.pic_code IS 'Property Identification Code where this run occurred';
