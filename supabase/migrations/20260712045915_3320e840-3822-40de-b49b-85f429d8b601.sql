-- 1) Tighten public affiliate signup policy: enforce default commission_rate,
--    empty payout_bank_details, and strict affiliate_code format at RLS.
DROP POLICY IF EXISTS "Public can apply as affiliate with safe defaults" ON public.affiliates;

CREATE POLICY "Public can apply as affiliate with safe defaults"
ON public.affiliates
FOR INSERT
TO anon, authenticated
WITH CHECK (
  status = 'pending'
  AND COALESCE(total_clicks, 0) = 0
  AND COALESCE(total_signups, 0) = 0
  AND COALESCE(total_paid_conversions, 0) = 0
  AND COALESCE(total_commission, 0::numeric) = 0::numeric
  AND commission_rate = 10
  AND COALESCE(payout_bank_details, '{}'::jsonb) = '{}'::jsonb
  AND affiliate_code ~ '^DISHA-AFF-[A-Z0-9]{4,20}$'
);

-- 2) Revoke EXECUTE on the server-only helper. It is called exclusively by the
--    card-scanner edge function using the service_role client.
REVOKE EXECUTE ON FUNCTION public.increment_card_scan_usage(uuid) FROM PUBLIC, anon, authenticated;