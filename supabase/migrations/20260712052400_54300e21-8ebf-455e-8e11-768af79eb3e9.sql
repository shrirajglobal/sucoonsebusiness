
UPDATE public.vendors
   SET gst_number = NULL
 WHERE gst_number IS NOT NULL
   AND gst_number !~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$';

ALTER TABLE public.vendors
  ADD COLUMN pin_code text,
  ADD COLUMN transport_name text,
  ADD COLUMN transport_gstin text,
  ADD COLUMN transport_contact text;

ALTER TABLE public.customers
  ADD COLUMN gst_number text,
  ADD COLUMN address text,
  ADD COLUMN pin_code text,
  ADD COLUMN transport_name text,
  ADD COLUMN transport_gstin text,
  ADD COLUMN transport_contact text;

ALTER TABLE public.vendors
  ADD CONSTRAINT vendors_gst_number_format_check
  CHECK (gst_number IS NULL OR gst_number ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$');

ALTER TABLE public.customers
  ADD CONSTRAINT customers_gst_number_format_check
  CHECK (gst_number IS NULL OR gst_number ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$');
