-- Add level column to school_classes table
-- This migration adds the class level field (e.g., "KG1", "KG2", "B1", "B2")

ALTER TABLE school_classes
ADD COLUMN IF NOT EXISTS level VARCHAR(50);

-- Add a comment to describe the column
COMMENT ON COLUMN school_classes.level IS 'Class level code (e.g., KG1, KG2, B1, B2)';

-- Optional: Create an index on level for better query performance
CREATE INDEX IF NOT EXISTS idx_school_classes_level ON school_classes(level);
