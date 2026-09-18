-- Verified Premium-to-Premium chat photo sharing.
-- Images are uploaded to a private pending area and only become messages after
-- server-side entitlement, mutual-CHEERS and moderation checks pass.

alter table public.messages
  add column if not exists message_type text not null default 'text',
  add column if not exists image_path text,
  add column if not exists image_ai_score numeric,
  add column if not exists image_moderation_status text not null default 'not_applicable',
  add column if not exists image_verification_provider text;

do $$ begin
  alter table public.messages
    add constraint messages_message_type_check check (message_type in ('text','image'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.messages
    add constraint messages_image_moderation_status_check check (image_moderation_status in ('not_applicable','approved','rejected','pending'));
exception when duplicate_object then null; end $$;

create or replace function public.protect_chat_image_message_insert()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.role() = 'authenticated' then
    if new.message_type <> 'text'
      or new.image_path is not null
      or new.image_ai_score is not null
      or new.image_verification_provider is not null
      or new.image_moderation_status <> 'not_applicable'
    then
      raise exception 'Image messages must be created through the verified media service';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.protect_chat_image_message_insert() from public;

drop trigger if exists protect_chat_image_message_insert on public.messages;
create trigger protect_chat_image_message_insert
before insert on public.messages
for each row execute function public.protect_chat_image_message_insert();

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('chat-images','chat-images',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
set public=false,
    file_size_limit=excluded.file_size_limit,
    allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "Users can upload own pending chat images" on storage.objects;
create policy "Users can upload own pending chat images"
on storage.objects for insert to authenticated
with check (
  bucket_id='chat-images'
  and (storage.foldername(name))[1]='pending'
  and (storage.foldername(name))[2]=(auth.uid())::text
);

drop policy if exists "Users can delete own pending chat images" on storage.objects;
create policy "Users can delete own pending chat images"
on storage.objects for delete to authenticated
using (
  bucket_id='chat-images'
  and (storage.foldername(name))[1]='pending'
  and (storage.foldername(name))[2]=(auth.uid())::text
);

create index if not exists messages_image_path_idx
on public.messages (image_path)
where image_path is not null;
