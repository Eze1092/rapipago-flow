
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.es_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.es_admin() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.set_auditoria() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_timestamps() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.resumen_general() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.resumen_por_boca(date, date) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.resumen_por_cajero(date, date) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.serie_diaria(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cerrar_jornada(date, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.historial(date, date) FROM PUBLIC, anon;
