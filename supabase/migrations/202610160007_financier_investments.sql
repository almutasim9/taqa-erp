insert into storage.buckets (id, name, public)
values ('financier-investments', 'financier-investments', false)
on conflict (id) do update set public = false;

alter table public.financier_investments
  add column if not exists payment_method public.payment_method not null default 'cash',
  add column if not exists receipt_number text,
  add column if not exists notes text,
  add column if not exists created_by uuid references public.users(id);

create table public.financier_investment_attachments (
  id uuid primary key default gen_random_uuid(),
  investment_id uuid not null references public.financier_investments(id) on delete cascade,
  file_name text not null,
  storage_path text not null unique,
  mime_type text,
  file_size bigint,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

alter table public.financier_investments enable row level security;
alter table public.financier_investment_attachments enable row level security;

create policy financier_investments_admin_all on public.financier_investments
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy financier_investment_attachments_admin_all on public.financier_investment_attachments
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy financier_investments_storage_admin_all on storage.objects
  for all to authenticated
  using (bucket_id = 'financier-investments' and public.is_admin())
  with check (bucket_id = 'financier-investments' and public.is_admin());
