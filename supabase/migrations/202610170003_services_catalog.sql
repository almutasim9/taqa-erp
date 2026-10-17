create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  service_code text unique not null,
  name text not null,
  description text,
  cost_price bigint not null default 0 check(cost_price >= 0),
  selling_price bigint not null default 0 check(selling_price >= 0),
  status public.record_status not null default 'active',
  created_at timestamptz not null default now()
);

alter table public.services enable row level security;

drop policy if exists services_admin_all on public.services;
create policy services_admin_all on public.services
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.invoice_items add column if not exists service_id uuid references public.services(id);
create index if not exists invoice_items_service_idx on public.invoice_items(service_id);
