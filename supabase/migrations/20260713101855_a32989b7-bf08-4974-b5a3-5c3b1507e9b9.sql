GRANT EXECUTE ON FUNCTION public.get_user_business_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.business_has_growth_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.business_has_scale_access(uuid) TO authenticated;