create or replace function public.claim_stripe_webhook_event(p_event_id text,p_event_type text,p_stale_after_seconds integer default 300)
returns boolean language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_status text; v_last_attempt timestamptz;
begin
 if current_user not in ('postgres','service_role') then raise exception 'not authorized'; end if;
 if p_event_id is null or btrim(p_event_id)='' or length(p_event_id)>255 then raise exception 'invalid event id'; end if;
 if p_event_type is null or btrim(p_event_type)='' or length(p_event_type)>255 then raise exception 'invalid event type'; end if;
 if p_stale_after_seconds<30 or p_stale_after_seconds>3600 then raise exception 'invalid stale timeout'; end if;
 insert into public.stripe_webhook_events(event_id,event_type) values(p_event_id,p_event_type) on conflict(event_id) do nothing;
 if found then return true; end if;
 select status,last_attempt_at into v_status,v_last_attempt from public.stripe_webhook_events where event_id=p_event_id for update;
 if v_status='processed' then return false; end if;
 if v_status='processing' and v_last_attempt>now()-make_interval(secs=>p_stale_after_seconds) then return false; end if;
 update public.stripe_webhook_events set status='processing',attempts=attempts+1,last_attempt_at=now(),last_error=null where event_id=p_event_id;
 return true;
end $$;

create or replace function public.complete_stripe_webhook_event(p_event_id text) returns void language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if current_user not in ('postgres','service_role') then raise exception 'not authorized'; end if;
 update public.stripe_webhook_events set status='processed',processed_at=now(),last_attempt_at=now(),last_error=null where event_id=p_event_id;
 if not found then raise exception 'unknown webhook event'; end if;
end $$;

create or replace function public.fail_stripe_webhook_event(p_event_id text,p_error text) returns void language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if current_user not in ('postgres','service_role') then raise exception 'not authorized'; end if;
 update public.stripe_webhook_events set status='failed',last_attempt_at=now(),last_error=left(coalesce(p_error,'unknown error'),2000) where event_id=p_event_id;
 if not found then raise exception 'unknown webhook event'; end if;
end $$;

revoke all on function public.claim_stripe_webhook_event(text,text,integer) from public,anon,authenticated;
revoke all on function public.complete_stripe_webhook_event(text) from public,anon,authenticated;
revoke all on function public.fail_stripe_webhook_event(text,text) from public,anon,authenticated;
grant execute on function public.claim_stripe_webhook_event(text,text,integer) to service_role;
grant execute on function public.complete_stripe_webhook_event(text) to service_role;
grant execute on function public.fail_stripe_webhook_event(text,text) to service_role;
