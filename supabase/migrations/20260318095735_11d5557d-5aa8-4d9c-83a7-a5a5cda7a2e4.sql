
-- Transactions for Cash Flow
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  category text NOT NULL DEFAULT 'General',
  amount numeric NOT NULL DEFAULT 0,
  date date NOT NULL DEFAULT CURRENT_DATE,
  description text,
  payment_method text DEFAULT 'cash',
  reference_no text,
  gst_rate numeric DEFAULT 0,
  gst_amount numeric DEFAULT 0,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view transactions" ON public.transactions FOR SELECT USING (business_id = get_user_business_id(auth.uid()));
CREATE POLICY "Members can create transactions" ON public.transactions FOR INSERT TO authenticated WITH CHECK (business_id = get_user_business_id(auth.uid()));
CREATE POLICY "Members can update transactions" ON public.transactions FOR UPDATE USING (business_id = get_user_business_id(auth.uid()));
CREATE POLICY "Members can delete transactions" ON public.transactions FOR DELETE USING (business_id = get_user_business_id(auth.uid()));

-- Inventory Items
CREATE TABLE public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  sku text,
  category text DEFAULT 'General',
  unit text DEFAULT 'pcs',
  quantity numeric NOT NULL DEFAULT 0,
  min_stock numeric DEFAULT 0,
  cost_price numeric DEFAULT 0,
  sell_price numeric DEFAULT 0,
  location text,
  branch_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view inventory" ON public.inventory_items FOR SELECT USING (business_id = get_user_business_id(auth.uid()));
CREATE POLICY "Members can create inventory" ON public.inventory_items FOR INSERT TO authenticated WITH CHECK (business_id = get_user_business_id(auth.uid()));
CREATE POLICY "Members can update inventory" ON public.inventory_items FOR UPDATE USING (business_id = get_user_business_id(auth.uid()));
CREATE POLICY "Members can delete inventory" ON public.inventory_items FOR DELETE USING (business_id = get_user_business_id(auth.uid()));

-- Vendors
CREATE TABLE public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  company text,
  phone text,
  email text,
  gst_number text,
  address text,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view vendors" ON public.vendors FOR SELECT USING (business_id = get_user_business_id(auth.uid()));
CREATE POLICY "Members can create vendors" ON public.vendors FOR INSERT TO authenticated WITH CHECK (business_id = get_user_business_id(auth.uid()));
CREATE POLICY "Members can update vendors" ON public.vendors FOR UPDATE USING (business_id = get_user_business_id(auth.uid()));
CREATE POLICY "Members can delete vendors" ON public.vendors FOR DELETE USING (business_id = get_user_business_id(auth.uid()));

-- Purchase Orders
CREATE TYPE public.po_status AS ENUM ('draft', 'sent', 'received', 'cancelled');

CREATE TABLE public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  vendor_id uuid REFERENCES public.vendors(id),
  po_number text NOT NULL,
  status po_status DEFAULT 'draft',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_amount numeric DEFAULT 0,
  order_date date DEFAULT CURRENT_DATE,
  expected_date date,
  received_date date,
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view POs" ON public.purchase_orders FOR SELECT USING (business_id = get_user_business_id(auth.uid()));
CREATE POLICY "Members can create POs" ON public.purchase_orders FOR INSERT TO authenticated WITH CHECK (business_id = get_user_business_id(auth.uid()));
CREATE POLICY "Members can update POs" ON public.purchase_orders FOR UPDATE USING (business_id = get_user_business_id(auth.uid()));
CREATE POLICY "Members can delete POs" ON public.purchase_orders FOR DELETE USING (business_id = get_user_business_id(auth.uid()));

-- Compliance Events
CREATE TABLE public.compliance_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text NOT NULL DEFAULT 'other',
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.compliance_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view compliance" ON public.compliance_events FOR SELECT USING (business_id = get_user_business_id(auth.uid()));
CREATE POLICY "Members can create compliance" ON public.compliance_events FOR INSERT TO authenticated WITH CHECK (business_id = get_user_business_id(auth.uid()));
CREATE POLICY "Members can update compliance" ON public.compliance_events FOR UPDATE USING (business_id = get_user_business_id(auth.uid()));
CREATE POLICY "Members can delete compliance" ON public.compliance_events FOR DELETE USING (business_id = get_user_business_id(auth.uid()));

-- Branches
CREATE TABLE public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  city text,
  state text,
  address text,
  phone text,
  manager_name text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view branches" ON public.branches FOR SELECT USING (business_id = get_user_business_id(auth.uid()));
CREATE POLICY "Members can create branches" ON public.branches FOR INSERT TO authenticated WITH CHECK (business_id = get_user_business_id(auth.uid()));
CREATE POLICY "Members can update branches" ON public.branches FOR UPDATE USING (business_id = get_user_business_id(auth.uid()));
CREATE POLICY "Members can delete branches" ON public.branches FOR DELETE USING (business_id = get_user_business_id(auth.uid()));
