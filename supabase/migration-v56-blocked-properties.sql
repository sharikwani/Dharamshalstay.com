-- v56: properties that asked to leave Dharamshala Stay can never be listed again.
-- A trigger on properties refuses to add a blocked property (by name, slug or phone) and refuses to set its
-- status to anything other than suspended or rejected, whoever does it: partner sign-up, partner edit,
-- admin pages, claim links or a directory import. Keep in step with lib/listings/blocked.ts.
-- To unblock one day, delete its row from blocked_properties.

create table if not exists public.blocked_properties (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  name_key text,            -- lower-case letters and digits only, matched anywhere in the name
  phones text[] not null default '{}',  -- last 10 digits
  slugs text[] not null default '{}',
  reason text,
  created_at timestamptz not null default now()
);

alter table public.blocked_properties enable row level security;
-- No policies on purpose: only the service role and the trigger (security definer) read it.

insert into public.blocked_properties (label, name_key, phones, slugs, reason)
select 'White Rabbit Guest House, Upper Bhagsu', 'whiterabbit', array['8350950090'], array['white-rabbit-guest-house-bhagsu'],
       'Owner instruction 19 Nov 2026 (agreed by phone): no longer takes bookings through Dharamshala Stay.'
where not exists (select 1 from public.blocked_properties where name_key = 'whiterabbit');

create or replace function public.refuse_blocked_property() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  n text := regexp_replace(lower(coalesce(new.name, '')), '[^a-z0-9]', '', 'g');
  ph1 text := right(regexp_replace(coalesce(new.contact_phone, ''), '\D', '', 'g'), 10);
  ph2 text := right(regexp_replace(coalesce(new.contact_whatsapp, ''), '\D', '', 'g'), 10);
  hit boolean;
begin
  select exists (
    select 1 from public.blocked_properties b
    where (b.name_key is not null and b.name_key <> '' and position(b.name_key in n) > 0)
       or new.slug = any(b.slugs)
       or exists (select 1 from unnest(b.slugs) s where new.slug like s || '-%')
       or (length(ph1) = 10 and ph1 = any(b.phones))
       or (length(ph2) = 10 and ph2 = any(b.phones))
  ) into hit;

  if hit and (tg_op = 'INSERT' or new.status not in ('suspended', 'rejected')) then
    raise exception 'This property cannot be listed on Dharamshala Stay. Please contact us if you think this is a mistake.'
      using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists properties_refuse_blocked on public.properties;
create trigger properties_refuse_blocked
  before insert or update on public.properties
  for each row execute function public.refuse_blocked_property();
