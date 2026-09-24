create extension if not exists pgcrypto;

create table if not exists public.residents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Wanda',
  help_message text not null default 'You are safe. Someone from your care team is nearby.',
  created_at timestamptz not null default now()
);

create table if not exists public.caregiver_access (
  resident_id uuid not null references public.residents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'family' check (role in ('owner','family','staff')),
  primary key (resident_id,user_id)
);

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  resident_id uuid references public.residents(id) on delete set null,
  last_seen timestamptz,
  paired_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.pair_codes (
  device_id uuid primary key references public.devices(id) on delete cascade,
  display_code text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.pair_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  attempted_at timestamptz not null default now(),
  succeeded boolean not null default false
);

create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  resident_id uuid not null references public.residents(id) on delete cascade,
  type text not null check (type in ('photo','video','audio')),
  title text not null,
  storage_path text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.resident_settings (
  resident_id uuid primary key references public.residents(id) on delete cascade,
  theme text not null default 'original' check (theme in ('original','warm','garden')),
  interaction_mode text not null default 'choose' check (interaction_mode in ('choose','guide','channel')),
  channel_enabled boolean not null default false,
  show_clock boolean not null default true,
  show_captions boolean not null default true,
  life_profile jsonb not null default '{}'::jsonb,
  comfort_plan jsonb not null default '{}'::jsonb,
  day_plan jsonb not null default '{"morning":"music","afternoon":"photos","evening":"video"}'::jsonb,
  home_today jsonb,
  consent jsonb not null default '{"personalMedia":false,"careTeam":false}'::jsonb,
  revision bigint not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists public.family_invites (
  id uuid primary key default gen_random_uuid(),
  resident_id uuid not null references public.residents(id) on delete cascade,
  email text not null,
  token uuid not null unique default gen_random_uuid(),
  expires_at timestamptz not null default (now()+interval '7 days'),
  accepted_at timestamptz,
  created_by uuid not null references auth.users(id) on delete cascade
);

create table if not exists public.security_events (
  id bigint generated always as identity primary key,
  resident_id uuid references public.residents(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  event text not null,
  created_at timestamptz not null default now()
);

alter table public.residents enable row level security;
alter table public.caregiver_access enable row level security;
alter table public.devices enable row level security;
alter table public.pair_codes enable row level security;
alter table public.pair_attempts enable row level security;
alter table public.media enable row level security;
alter table public.resident_settings enable row level security;
alter table public.family_invites enable row level security;
alter table public.security_events enable row level security;

create or replace function public.can_access_resident(p_resident uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.residents r where r.id=p_resident and r.owner_id=auth.uid())
  or exists(select 1 from public.caregiver_access c where c.resident_id=p_resident and c.user_id=auth.uid())
  or exists(select 1 from public.devices d where d.resident_id=p_resident and d.auth_user_id=auth.uid());
$$;

create or replace function public.can_manage_resident(p_resident uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.residents r where r.id=p_resident and r.owner_id=auth.uid())
  or exists(select 1 from public.caregiver_access c where c.resident_id=p_resident and c.user_id=auth.uid());
$$;

drop policy if exists residents_read on public.residents;
create policy residents_read on public.residents for select using (public.can_access_resident(id));
drop policy if exists residents_insert on public.residents;
create policy residents_insert on public.residents for insert with check (owner_id=auth.uid() and coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false);
drop policy if exists residents_update on public.residents;
create policy residents_update on public.residents for update using (public.can_manage_resident(id)) with check (public.can_manage_resident(id));

drop policy if exists media_read on public.media;
create policy media_read on public.media for select using (public.can_access_resident(resident_id));
drop policy if exists media_write on public.media;
create policy media_write on public.media for all using (public.can_manage_resident(resident_id)) with check (public.can_manage_resident(resident_id));

drop policy if exists resident_settings_read on public.resident_settings;
create policy resident_settings_read on public.resident_settings for select using (public.can_access_resident(resident_id));
drop policy if exists resident_settings_write on public.resident_settings;
create policy resident_settings_write on public.resident_settings for all using (public.can_manage_resident(resident_id)) with check (public.can_manage_resident(resident_id));

create or replace function public.bump_resident_settings_revision()
returns trigger language plpgsql set search_path=public as $$
begin
  new.revision=coalesce(old.revision,0)+1;
  new.updated_at=now();
  return new;
end;
$$;

drop trigger if exists resident_settings_revision on public.resident_settings;
create trigger resident_settings_revision before update on public.resident_settings for each row execute function public.bump_resident_settings_revision();

drop policy if exists devices_own_read on public.devices;
create policy devices_own_read on public.devices for select using (auth_user_id=auth.uid() or (resident_id is not null and public.can_access_resident(resident_id)));

insert into storage.buckets(id,name,public) values('resident-media','resident-media',false) on conflict(id) do update set public=false;
drop policy if exists resident_media_read on storage.objects;
create policy resident_media_read on storage.objects for select using (bucket_id='resident-media' and public.can_access_resident(((storage.foldername(name))[1])::uuid));
drop policy if exists resident_media_insert on storage.objects;
create policy resident_media_insert on storage.objects for insert with check (bucket_id='resident-media' and public.can_manage_resident(((storage.foldername(name))[1])::uuid));
drop policy if exists resident_media_delete on storage.objects;
create policy resident_media_delete on storage.objects for delete using (bucket_id='resident-media' and public.can_manage_resident(((storage.foldername(name))[1])::uuid));

create or replace function public.get_or_create_pair_code()
returns text language plpgsql security definer set search_path=public as $$
declare v_device uuid; v_code text;
begin
  if auth.uid() is null then raise exception 'Device sign-in required'; end if;
  insert into public.devices(auth_user_id) values(auth.uid()) on conflict(auth_user_id) do update set auth_user_id=excluded.auth_user_id returning id into v_device;
  delete from public.pair_codes where device_id=v_device or expires_at<now() or used_at is not null;
  loop
    v_code=lpad((floor(random()*1000000))::int::text,6,'0');
    begin
      insert into public.pair_codes(device_id,display_code,expires_at) values(v_device,v_code,now()+interval '10 minutes');
      exit;
    exception when unique_violation then null;
    end;
  end loop;
  return v_code;
end;
$$;

create or replace function public.claim_pair_code(p_code text,p_resident_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_pair public.pair_codes%rowtype; v_recent integer;
begin
  if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Caregiver sign-in required'; end if;
  if not public.can_access_resident(p_resident_id) then raise exception 'You do not have access to this resident'; end if;
  select count(*) into v_recent from public.pair_attempts where user_id=auth.uid() and attempted_at>now()-interval '10 minutes';
  if v_recent>=5 then raise exception 'Too many attempts. Wait ten minutes and try again'; end if;
  select * into v_pair from public.pair_codes where display_code=p_code and expires_at>now() and used_at is null for update;
  insert into public.pair_attempts(user_id,succeeded) values(auth.uid(),v_pair.device_id is not null);
  if v_pair.device_id is null then return false; end if;
  update public.devices set resident_id=p_resident_id,paired_at=now(),last_seen=now() where id=v_pair.device_id;
  update public.pair_codes set used_at=now(),display_code=gen_random_uuid()::text where device_id=v_pair.device_id;
  insert into public.security_events(resident_id,user_id,event) values(p_resident_id,auth.uid(),'device_paired');
  return true;
end;
$$;

create or replace function public.claim_pair_code_only(p_code text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_pair public.pair_codes%rowtype; v_recent integer; v_resident uuid;
begin
  if auth.uid() is null then raise exception 'Secure browser session required'; end if;
  select count(*) into v_recent from public.pair_attempts where user_id=auth.uid() and attempted_at>now()-interval '10 minutes';
  if v_recent>=5 then raise exception 'Too many attempts. Wait ten minutes and try again'; end if;
  select * into v_pair from public.pair_codes where display_code=p_code and expires_at>now() and used_at is null for update;
  insert into public.pair_attempts(user_id,succeeded) values(auth.uid(),v_pair.device_id is not null);
  if v_pair.device_id is null then return null; end if;
  select id into v_resident from public.residents where owner_id=auth.uid() order by created_at limit 1;
  if v_resident is null then
    insert into public.residents(owner_id,name,help_message) values(auth.uid(),'Wanda','You are safe. Someone from your care team is nearby.') returning id into v_resident;
  end if;
  update public.devices set resident_id=v_resident,paired_at=now(),last_seen=now() where id=v_pair.device_id;
  update public.pair_codes set used_at=now(),display_code=gen_random_uuid()::text where device_id=v_pair.device_id;
  insert into public.security_events(resident_id,user_id,event) values(v_resident,auth.uid(),'device_paired_code_only');
  return v_resident;
end;
$$;

create or replace function public.touch_device()
returns void language sql security definer set search_path=public as $$
  update public.devices set last_seen=now() where auth_user_id=auth.uid();
$$;

create or replace function public.disconnect_device(p_device_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_resident uuid;
begin
  select resident_id into v_resident from public.devices where id=p_device_id for update;
  if v_resident is null then raise exception 'Screen is not connected'; end if;
  if not public.can_manage_resident(v_resident) then raise exception 'You do not have permission to disconnect this screen'; end if;
  update public.devices set resident_id=null,paired_at=null where id=p_device_id;
  delete from public.pair_codes where device_id=p_device_id;
  insert into public.security_events(resident_id,user_id,event) values(v_resident,auth.uid(),'device_disconnected');
  return true;
end;
$$;

create or replace function public.create_family_invite(p_email text,p_resident_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_token uuid;
begin
  if not exists(select 1 from public.residents where id=p_resident_id and owner_id=auth.uid()) then raise exception 'Only the owner can invite family'; end if;
  insert into public.family_invites(resident_id,email,created_by) values(p_resident_id,lower(trim(p_email)),auth.uid()) returning token into v_token;
  return v_token;
end;
$$;

create or replace function public.accept_family_invite(p_token uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_invite public.family_invites%rowtype; v_email text;
begin
  if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Sign in required'; end if;
  v_email=lower(coalesce(auth.jwt()->>'email',''));
  select * into v_invite from public.family_invites where token=p_token and expires_at>now() and accepted_at is null for update;
  if v_invite.id is null or v_invite.email<>v_email then raise exception 'Invitation is invalid, expired, or belongs to another email'; end if;
  insert into public.caregiver_access(resident_id,user_id,role) values(v_invite.resident_id,auth.uid(),'family') on conflict do nothing;
  update public.family_invites set accepted_at=now() where id=v_invite.id;
  insert into public.security_events(resident_id,user_id,event) values(v_invite.resident_id,auth.uid(),'family_invite_accepted');
  return true;
end;
$$;

revoke all on function public.get_or_create_pair_code() from public;
revoke all on function public.claim_pair_code(text,uuid) from public;
revoke all on function public.claim_pair_code_only(text) from public;
revoke all on function public.create_family_invite(text,uuid) from public;
revoke all on function public.accept_family_invite(uuid) from public;
revoke all on function public.touch_device() from public;
revoke all on function public.disconnect_device(uuid) from public;
grant execute on function public.get_or_create_pair_code() to authenticated;
grant execute on function public.claim_pair_code(text,uuid) to authenticated;
grant execute on function public.claim_pair_code_only(text) to authenticated;
grant execute on function public.create_family_invite(text,uuid) to authenticated;
grant execute on function public.accept_family_invite(uuid) to authenticated;
grant execute on function public.touch_device() to authenticated;
grant execute on function public.disconnect_device(uuid) to authenticated;

grant usage on schema public to anon,authenticated;
grant select,insert,update,delete on public.residents to authenticated;
grant select,insert,update,delete on public.media to authenticated;
grant select,insert,update,delete on public.resident_settings to authenticated;
grant select on public.devices to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.residents;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.media;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.resident_settings;
exception when duplicate_object then null;
end $$;
