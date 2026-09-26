create or replace function public.set_admin_app_feedback_status(p_feedback_id uuid, p_status text)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  caller_email text := lower(coalesce(auth.jwt()->>'email', ''));
  updated public.app_feedback;
begin
  if auth.uid() is null or caller_email <> 'sipmate.app@gmail.com' then
    raise exception 'Not authorized';
  end if;
  if p_status not in ('new','reviewed','resolved') then
    raise exception 'Invalid status';
  end if;

  update public.app_feedback
  set status = p_status,
      reviewed_at = case when p_status='new' then null else now() end
  where id = p_feedback_id
  returning * into updated;

  if updated.id is null then
    raise exception 'Feedback not found';
  end if;

  return jsonb_build_object('ok', true, 'id', updated.id, 'status', updated.status, 'reviewed_at', updated.reviewed_at);
end;
$function$;

revoke all on function public.set_admin_app_feedback_status(uuid,text) from public, anon;
grant execute on function public.set_admin_app_feedback_status(uuid,text) to authenticated;
