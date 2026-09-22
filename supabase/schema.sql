create extension if not exists pgcrypto;

create table if not exists public.promos (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  bookmaker text not null,
  type text not null,
  stake numeric not null default 0,
  odds numeric not null default 0,
  outcome text not null,
  freebets numeric not null default 0,
  cashback_rate numeric not null default 0,
  cashback_cap numeric not null default 0,
  event_date date not null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.promos enable row level security;

create or replace function public.set_promos_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists promos_set_updated_at on public.promos;

create trigger promos_set_updated_at
before update on public.promos
for each row
execute function public.set_promos_updated_at();
