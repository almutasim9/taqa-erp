create table if not exists public.financier_withdrawals (
  id uuid primary key default gen_random_uuid(),
  withdrawal_number text unique not null,
  financier_id uuid not null references public.financiers(id) on delete cascade,
  amount bigint not null check(amount > 0),
  withdrawal_type text not null default 'mixed' check(withdrawal_type in ('capital','profit','mixed')),
  withdrawal_date date not null default current_date,
  payment_method public.payment_method not null default 'cash',
  receipt_number text,
  notes text,
  status public.record_status not null default 'active',
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.financier_withdrawal_attachments (
  id uuid primary key default gen_random_uuid(),
  withdrawal_id uuid not null references public.financier_withdrawals(id) on delete cascade,
  file_name text not null,
  storage_path text not null unique,
  mime_type text,
  file_size bigint,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public)
values ('financier-withdrawals', 'financier-withdrawals', false)
on conflict (id) do update set public = false;

alter table public.financier_transactions enable row level security;
alter table public.financier_withdrawals enable row level security;
alter table public.financier_withdrawal_attachments enable row level security;

drop policy if exists financier_transactions_admin_all on public.financier_transactions;
create policy financier_transactions_admin_all on public.financier_transactions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists financier_withdrawals_admin_all on public.financier_withdrawals;
create policy financier_withdrawals_admin_all on public.financier_withdrawals
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists financier_withdrawal_attachments_admin_all on public.financier_withdrawal_attachments;
create policy financier_withdrawal_attachments_admin_all on public.financier_withdrawal_attachments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists financier_withdrawals_storage_admin_all on storage.objects;
create policy financier_withdrawals_storage_admin_all on storage.objects
  for all to authenticated using (bucket_id = 'financier-withdrawals' and public.is_admin())
  with check (bucket_id = 'financier-withdrawals' and public.is_admin());
