
-- Add sector column to dimension_tasks to link tasks to production cards
ALTER TABLE public.dimension_tasks 
ADD COLUMN IF NOT EXISTS sector text DEFAULT NULL;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_dimension_tasks_sector ON public.dimension_tasks(sector);
