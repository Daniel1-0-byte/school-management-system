-- Comprehensive migration: Add level column to school_classes table with data population

-- Step 1: Add the level column if it doesn't exist
ALTER TABLE school_classes
ADD COLUMN IF NOT EXISTS level VARCHAR(50);

-- Step 2: Add a comment to describe the column
COMMENT ON COLUMN school_classes.level IS 'Class level code (e.g., KG1, KG2, B1, B2)';

-- Step 3: Populate level from name if name contains level pattern
-- This updates rows where name starts with the level code
UPDATE school_classes
SET level = SUBSTRING(name, 1, POSITION(' ' IN name) - 1)
WHERE level IS NULL 
  AND name ~ '^[A-Z]{0,3}[0-9]{1,2}\s';

-- Step 4: For any remaining NULL levels, set a default based on the first few characters
UPDATE school_classes
SET level = SUBSTRING(name, 1, 3)
WHERE level IS NULL;

-- Step 5: Create an index on level for better query performance
CREATE INDEX IF NOT EXISTS idx_school_classes_level ON school_classes(level);

-- Step 6: Verify the data was populated
-- Run this SELECT to verify the migration worked:
-- SELECT id, name, level FROM school_classes ORDER BY level;
