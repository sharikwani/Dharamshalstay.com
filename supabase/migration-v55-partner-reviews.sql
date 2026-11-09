-- v55: customer star ratings for travel partners (taxi, trek, paragliding).
-- One review per booking, written through a signed link we send after the trip (/rate/<token>), so every
-- review comes from a real customer. Only the service role reads or writes; pages show approved rows.
create table if not exists public.partner_reviews (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.profiles(id) on delete cascade,
  booking_id uuid unique references public.bookings(id) on delete set null,
  category text not null check (category in ('taxi', 'trek', 'paragliding')),
  item text,
  vehicle text,
  name text not null check (char_length(name) between 1 and 60),
  rating smallint not null check (rating between 1 and 5),
  body text check (body is null or char_length(body) <= 1500),
  status text not null default 'approved' check (status in ('approved', 'hidden')),
  created_at timestamptz not null default now()
);

create index if not exists partner_reviews_partner_idx on public.partner_reviews (partner_id, status, created_at desc);

alter table public.partner_reviews enable row level security;
-- No policies on purpose: the anon and authenticated roles get nothing; the server uses the service role.
