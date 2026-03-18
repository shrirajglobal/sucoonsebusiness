
-- Leave types table
CREATE TABLE public.leave_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  days_per_year integer NOT NULL DEFAULT 12,
  is_paid boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view leave types" ON public.leave_types FOR SELECT USING (business_id = get_user_business_id(auth.uid()));
CREATE POLICY "Members can create leave types" ON public.leave_types FOR INSERT TO authenticated WITH CHECK (business_id = get_user_business_id(auth.uid()));
CREATE POLICY "Members can update leave types" ON public.leave_types FOR UPDATE USING (business_id = get_user_business_id(auth.uid()));
CREATE POLICY "Members can delete leave types" ON public.leave_types FOR DELETE USING (business_id = get_user_business_id(auth.uid()));

-- Leave requests table
CREATE TABLE public.leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_name text NOT NULL,
  leave_type_id uuid REFERENCES public.leave_types(id) ON DELETE SET NULL,
  leave_type_name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  days numeric NOT NULL DEFAULT 1,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view leave requests" ON public.leave_requests FOR SELECT USING (business_id = get_user_business_id(auth.uid()));
CREATE POLICY "Members can create leave requests" ON public.leave_requests FOR INSERT TO authenticated WITH CHECK (business_id = get_user_business_id(auth.uid()));
CREATE POLICY "Members can update leave requests" ON public.leave_requests FOR UPDATE USING (business_id = get_user_business_id(auth.uid()));
CREATE POLICY "Members can delete leave requests" ON public.leave_requests FOR DELETE USING (business_id = get_user_business_id(auth.uid()));

-- Shifts table
CREATE TABLE public.shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view shifts" ON public.shifts FOR SELECT USING (business_id = get_user_business_id(auth.uid()));
CREATE POLICY "Members can create shifts" ON public.shifts FOR INSERT TO authenticated WITH CHECK (business_id = get_user_business_id(auth.uid()));
CREATE POLICY "Members can update shifts" ON public.shifts FOR UPDATE USING (business_id = get_user_business_id(auth.uid()));
CREATE POLICY "Members can delete shifts" ON public.shifts FOR DELETE USING (business_id = get_user_business_id(auth.uid()));

-- Add shift_id to team_members
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS shift_id uuid REFERENCES public.shifts(id) ON DELETE SET NULL;
