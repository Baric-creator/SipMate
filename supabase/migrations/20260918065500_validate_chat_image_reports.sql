create or replace function public.validate_chat_image_report()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  m public.messages%rowtype;
  c public.conversations%rowtype;
begin
  if new.report_kind <> 'chat_image' then
    new.reported_message_id := null;
    return new;
  end if;

  if new.reported_message_id is null then
    raise exception 'Chat image report requires a message';
  end if;

  select * into m from public.messages where id = new.reported_message_id;
  if not found or m.message_type <> 'image' then
    raise exception 'Reported chat image does not exist';
  end if;

  if m.sender_id <> new.reported_id then
    raise exception 'Reported user must be the image sender';
  end if;

  select * into c from public.conversations where id = m.conversation_id;
  if not found
    or not (
      (c.user_one = new.reporter_id and c.user_two = new.reported_id)
      or (c.user_two = new.reporter_id and c.user_one = new.reported_id)
    )
  then
    raise exception 'Reporter is not a participant in this chat image';
  end if;

  return new;
end;
$$;

revoke execute on function public.validate_chat_image_report() from public, anon, authenticated;

drop trigger if exists validate_chat_image_report on public.reports;
create trigger validate_chat_image_report
before insert or update of report_kind, reported_message_id, reporter_id, reported_id
on public.reports
for each row execute function public.validate_chat_image_report();
