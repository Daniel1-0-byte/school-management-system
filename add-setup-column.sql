-- Add setup_completed column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN setup_completed BOOLEAN DEFAULT FALSE;

-- Create index for performance
CREATE INDEX idx_profiles_setup_completed ON public.profiles(setup_completed);

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'setup_completed';
