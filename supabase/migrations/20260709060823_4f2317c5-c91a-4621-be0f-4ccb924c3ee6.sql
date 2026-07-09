-- Public buckets serve direct object URLs without RLS. The permissive SELECT
-- policy only affected listing, so removing it blocks file enumeration while
-- preserving public logo URLs used across the app.
DROP POLICY IF EXISTS "Public can view logos" ON storage.objects;