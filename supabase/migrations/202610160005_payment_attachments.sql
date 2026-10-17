insert into storage.buckets (id, name, public)
values ('payment-receipts', 'payment-receipts', false)
on conflict (id) do update set public = false;

create table public.payment_attachments (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  file_name text not null,
  storage_path text not null unique,
  mime_type text,
  file_size bigint,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

alter table public.payment_attachments enable row level security;

create policy payment_attachments_admin_all on public.payment_attachments
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy payment_receipts_storage_admin_all on storage.objects
  for all to authenticated
  using (bucket_id = 'payment-receipts' and public.is_admin())
  with check (bucket_id = 'payment-receipts' and public.is_admin());
