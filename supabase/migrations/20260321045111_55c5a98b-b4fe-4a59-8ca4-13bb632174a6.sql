
-- Ideas table
CREATE TABLE public.ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  voice_note_url text,
  created_by uuid NOT NULL,
  created_by_name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'medium',
  converted_task_id uuid REFERENCES public.tasks(id),
  tags text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view ideas" ON public.ideas FOR SELECT TO authenticated
  USING (business_id = get_user_business_id(auth.uid()));
CREATE POLICY "Members can create ideas" ON public.ideas FOR INSERT TO authenticated
  WITH CHECK (business_id = get_user_business_id(auth.uid()));
CREATE POLICY "Members can update ideas" ON public.ideas FOR UPDATE TO authenticated
  USING (business_id = get_user_business_id(auth.uid()));
CREATE POLICY "Members can delete ideas" ON public.ideas FOR DELETE TO authenticated
  USING (business_id = get_user_business_id(auth.uid()));

-- Idea members
CREATE TABLE public.idea_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id uuid NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.idea_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view idea_members" ON public.idea_members FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ideas i WHERE i.id = idea_members.idea_id AND i.business_id = get_user_business_id(auth.uid())));
CREATE POLICY "Members can create idea_members" ON public.idea_members FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.ideas i WHERE i.id = idea_members.idea_id AND i.business_id = get_user_business_id(auth.uid())));
CREATE POLICY "Members can delete idea_members" ON public.idea_members FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ideas i WHERE i.id = idea_members.idea_id AND i.business_id = get_user_business_id(auth.uid())));

-- Idea comments
CREATE TABLE public.idea_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id uuid NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  content text NOT NULL,
  voice_note_url text,
  created_by uuid NOT NULL,
  user_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.idea_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view idea_comments" ON public.idea_comments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ideas i WHERE i.id = idea_comments.idea_id AND i.business_id = get_user_business_id(auth.uid())));
CREATE POLICY "Members can create idea_comments" ON public.idea_comments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.ideas i WHERE i.id = idea_comments.idea_id AND i.business_id = get_user_business_id(auth.uid())));
CREATE POLICY "Members can delete idea_comments" ON public.idea_comments FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ideas i WHERE i.id = idea_comments.idea_id AND i.business_id = get_user_business_id(auth.uid())));

-- Task watchers (CC/Loop)
CREATE TABLE public.task_watchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.task_watchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view task_watchers" ON public.task_watchers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_watchers.task_id AND t.business_id = get_user_business_id(auth.uid())));
CREATE POLICY "Members can create task_watchers" ON public.task_watchers FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_watchers.task_id AND t.business_id = get_user_business_id(auth.uid())));
CREATE POLICY "Members can delete task_watchers" ON public.task_watchers FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_watchers.task_id AND t.business_id = get_user_business_id(auth.uid())));

-- Task reminders
CREATE TABLE public.task_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  remind_at timestamptz NOT NULL,
  channels text[] NOT NULL DEFAULT '{web}',
  is_sent boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.task_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view task_reminders" ON public.task_reminders FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_reminders.task_id AND t.business_id = get_user_business_id(auth.uid())));
CREATE POLICY "Members can create task_reminders" ON public.task_reminders FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_reminders.task_id AND t.business_id = get_user_business_id(auth.uid())));
CREATE POLICY "Members can delete task_reminders" ON public.task_reminders FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_reminders.task_id AND t.business_id = get_user_business_id(auth.uid())));

-- Voice note URL columns
ALTER TABLE public.lead_notes ADD COLUMN voice_note_url text;
ALTER TABLE public.task_notes ADD COLUMN voice_note_url text;

-- Voice notes storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('voice-notes', 'voice-notes', true);

-- Storage policies for voice-notes bucket
CREATE POLICY "Authenticated users can upload voice notes" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'voice-notes');
CREATE POLICY "Anyone can view voice notes" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'voice-notes');
CREATE POLICY "Users can delete own voice notes" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'voice-notes' AND (storage.foldername(name))[1] = auth.uid()::text);
