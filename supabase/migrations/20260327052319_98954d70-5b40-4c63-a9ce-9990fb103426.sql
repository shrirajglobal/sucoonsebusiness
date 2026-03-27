ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_assigned_to_fkey;
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_assigned_to_fkey;
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_assigned_to_fkey;