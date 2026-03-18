
-- Enums
CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'manager', 'executive', 'field_staff');
CREATE TYPE public.task_status AS ENUM ('todo', 'in_progress', 'on_hold', 'done', 'cancelled');
CREATE TYPE public.task_priority AS ENUM ('high', 'medium', 'low');
CREATE TYPE public.customer_tier AS ENUM ('A', 'B', 'C');
CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'half_day', 'leave', 'wfh', 'on_duty', 'late');
CREATE TYPE public.contact_method AS ENUM ('call', 'whatsapp', 'meeting', 'email');
CREATE TYPE public.contact_outcome AS ENUM ('positive', 'follow_up', 'not_reachable', 'not_interested', 'other');

-- Businesses table
CREATE TABLE public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  phone TEXT,
  logo_url TEXT,
  city TEXT,
  state TEXT,
  business_type TEXT NOT NULL DEFAULT 'custom',
  modules TEXT[] DEFAULT ARRAY['tasks', 'crm', 'attendance', 'forms', 'engagement'],
  pipeline_stages TEXT[] DEFAULT ARRAY['Stage 1', 'Stage 2', 'Stage 3'],
  task_types TEXT[] DEFAULT ARRAY['General'],
  tier_settings JSONB DEFAULT '{"A":{"name":"Priority","frequency":15},"B":{"name":"Regular","frequency":30},"C":{"name":"Occasional","frequency":60}}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  department TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User Roles table (separate as required)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'executive',
  UNIQUE(user_id, business_id)
);

-- Tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  priority task_priority DEFAULT 'medium',
  status task_status DEFAULT 'todo',
  due_date DATE,
  due_time TIME,
  task_type TEXT,
  linked_lead_id UUID,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Leads table
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  email TEXT,
  value NUMERIC,
  source TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  stage TEXT NOT NULL,
  notes TEXT,
  tags TEXT[],
  city TEXT,
  product_interest TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Attendance records
CREATE TABLE public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  user_name TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status attendance_status DEFAULT 'present',
  punch_in TIME,
  punch_out TIME,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Forms table
CREATE TABLE public.forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  fields JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Form responses
CREATE TABLE public.form_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  submitted_by UUID REFERENCES auth.users(id),
  submitted_at TIMESTAMPTZ DEFAULT now()
);

-- Customers table
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  email TEXT,
  tier customer_tier DEFAULT 'B',
  assigned_to UUID REFERENCES auth.users(id),
  last_contact_date TIMESTAMPTZ,
  last_contact_type TEXT,
  next_contact_date DATE,
  lifetime_value NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Contact logs
CREATE TABLE public.contact_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  logged_by UUID REFERENCES auth.users(id),
  method contact_method NOT NULL,
  outcome contact_outcome NOT NULL,
  notes TEXT,
  contact_date TIMESTAMPTZ DEFAULT now(),
  next_date DATE,
  linked_lead_id UUID REFERENCES public.leads(id)
);

-- Team members table (for invited but not yet registered users)
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  department TEXT,
  invited_at TIMESTAMPTZ DEFAULT now(),
  joined_at TIMESTAMPTZ
);

-- ==================== FUNCTIONS ====================

-- has_role function for RLS
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Get user's business_id
CREATE OR REPLACE FUNCTION public.get_user_business_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT business_id FROM public.profiles WHERE id = _user_id
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== RLS ====================

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Businesses policies
CREATE POLICY "Members can view their business" ON public.businesses FOR SELECT USING (id = public.get_user_business_id(auth.uid()));
CREATE POLICY "Authenticated users can create business" ON public.businesses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Members can update their business" ON public.businesses FOR UPDATE USING (id = public.get_user_business_id(auth.uid()));

-- User Roles policies
CREATE POLICY "Members can view roles in their business" ON public.user_roles FOR SELECT USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "Owners can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "Owners can update roles" ON public.user_roles FOR UPDATE USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "Owners can delete roles" ON public.user_roles FOR DELETE USING (business_id = public.get_user_business_id(auth.uid()));

-- Tasks policies
CREATE POLICY "Members can view tasks" ON public.tasks FOR SELECT USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "Members can create tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "Members can update tasks" ON public.tasks FOR UPDATE USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "Members can delete tasks" ON public.tasks FOR DELETE USING (business_id = public.get_user_business_id(auth.uid()));

-- Leads policies
CREATE POLICY "Members can view leads" ON public.leads FOR SELECT USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "Members can create leads" ON public.leads FOR INSERT TO authenticated WITH CHECK (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "Members can update leads" ON public.leads FOR UPDATE USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "Members can delete leads" ON public.leads FOR DELETE USING (business_id = public.get_user_business_id(auth.uid()));

-- Attendance policies
CREATE POLICY "Members can view attendance" ON public.attendance_records FOR SELECT USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "Members can create attendance" ON public.attendance_records FOR INSERT TO authenticated WITH CHECK (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "Members can update attendance" ON public.attendance_records FOR UPDATE USING (business_id = public.get_user_business_id(auth.uid()));

-- Forms policies
CREATE POLICY "Members can view forms" ON public.forms FOR SELECT USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "Members can create forms" ON public.forms FOR INSERT TO authenticated WITH CHECK (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "Members can update forms" ON public.forms FOR UPDATE USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "Members can delete forms" ON public.forms FOR DELETE USING (business_id = public.get_user_business_id(auth.uid()));

-- Form responses: public insert (for shared form links), authenticated read
CREATE POLICY "Anyone can submit form response" ON public.form_responses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Members can view responses" ON public.form_responses FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.forms f WHERE f.id = form_id AND f.business_id = public.get_user_business_id(auth.uid()))
);

-- Customers policies
CREATE POLICY "Members can view customers" ON public.customers FOR SELECT USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "Members can create customers" ON public.customers FOR INSERT TO authenticated WITH CHECK (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "Members can update customers" ON public.customers FOR UPDATE USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "Members can delete customers" ON public.customers FOR DELETE USING (business_id = public.get_user_business_id(auth.uid()));

-- Contact logs policies
CREATE POLICY "Members can view contact logs" ON public.contact_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.business_id = public.get_user_business_id(auth.uid()))
);
CREATE POLICY "Members can create contact logs" ON public.contact_logs FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.business_id = public.get_user_business_id(auth.uid()))
);

-- Team members policies
CREATE POLICY "Members can view team" ON public.team_members FOR SELECT USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "Members can manage team" ON public.team_members FOR INSERT TO authenticated WITH CHECK (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "Members can update team" ON public.team_members FOR UPDATE USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "Members can remove team" ON public.team_members FOR DELETE USING (business_id = public.get_user_business_id(auth.uid()));
