
-- Phase 2: standalone Products master

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text,
  unit text,
  default_rate numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Scale members can view products"
  ON public.products FOR SELECT
  USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));

CREATE POLICY "Scale members can create products"
  ON public.products FOR INSERT
  WITH CHECK (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));

CREATE POLICY "Scale members can update products"
  ON public.products FOR UPDATE
  USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));

CREATE POLICY "Scale members can delete products"
  ON public.products FOR DELETE
  USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));

CREATE INDEX products_business_id_idx ON public.products(business_id);
CREATE UNIQUE INDEX products_business_name_category_uidx
  ON public.products(business_id, lower(name), COALESCE(lower(category), ''));

-- Backfill products from distinct (business_id, product_name, category) in vendor_products.
-- default_rate = AVG(unit_price) across vendors for that combo (single sensible number
-- when the same product is sourced from multiple vendors at different prices).
INSERT INTO public.products (business_id, name, category, default_rate)
SELECT
  business_id,
  product_name,
  category,
  AVG(unit_price) FILTER (WHERE unit_price IS NOT NULL) AS default_rate
FROM public.vendor_products
GROUP BY business_id, product_name, category;

-- Link vendor_products -> products
ALTER TABLE public.vendor_products
  ADD COLUMN product_id uuid REFERENCES public.products(id);

UPDATE public.vendor_products vp
SET product_id = p.id
FROM public.products p
WHERE p.business_id = vp.business_id
  AND p.name = vp.product_name
  AND p.category IS NOT DISTINCT FROM vp.category;

CREATE INDEX vendor_products_product_id_idx ON public.vendor_products(product_id);

-- Link partner_orders -> products via existing vendor_product_id
ALTER TABLE public.partner_orders
  ADD COLUMN product_id uuid REFERENCES public.products(id);

UPDATE public.partner_orders po
SET product_id = vp.product_id
FROM public.vendor_products vp
WHERE po.vendor_product_id = vp.id
  AND vp.product_id IS NOT NULL;

CREATE INDEX partner_orders_product_id_idx ON public.partner_orders(product_id);
