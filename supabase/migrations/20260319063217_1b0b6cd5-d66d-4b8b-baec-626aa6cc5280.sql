
-- Add salary to team_members
ALTER TABLE public.team_members ADD COLUMN salary numeric DEFAULT 0;

-- Add gst_number to businesses
ALTER TABLE public.businesses ADD COLUMN gst_number text;
