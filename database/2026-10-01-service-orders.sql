-- PlusRent admin: the agenda / service journal (transfers, drivers, rentals taken by phone, free tasks) - 1 Oct 2026
-- Run once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Safe to run twice (IF NOT EXISTS). It creates one new table and touches nothing else.

create table if not exists public.service_orders (
  id            bigserial primary key,
  service       text not null check (service in ('transfer_iasi','transfer_kiv','sofer_personal','sofer_treaz','rental','task','other')),
  starts_at     timestamptz not null,
  ends_on       date,                 -- rentals: the return date
  title         text,                 -- tasks: what to do
  car_id        integer,              -- rentals: which car (cars.id)
  route_from    text,
  route_to      text,
  client_name   text,
  client_phone  text,
  tier          text check (tier in ('standard','business','vip')),
  passengers    smallint,
  price         numeric(10,2) not null default 0,
  currency      text not null default 'EUR' check (currency in ('EUR','MDL')),
  payment       text check (payment in ('cash','card','transfer')),
  status        text not null default 'planned' check (status in ('planned','done','cancelled')),
  -- what the trip cost, in lei
  cost_fuel     numeric(10,2) not null default 0,
  cost_docs     numeric(10,2) not null default 0,
  cost_wash     numeric(10,2) not null default 0,
  cost_other    numeric(10,2) not null default 0,
  notes         text,
  source_request_id bigint,   -- the site request (service_callbacks.id) it came from, if any
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists service_orders_starts_at_idx on public.service_orders (starts_at);

-- Only the server (service role key) reads and writes it: no policy = no access for the anon key.
alter table public.service_orders enable row level security;
