ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS voice_note_url text;
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;