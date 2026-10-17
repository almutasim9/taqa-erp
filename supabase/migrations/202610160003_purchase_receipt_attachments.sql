insert into storage.buckets (id, name, public)
values ('purchase-receipts', 'purchase-receipts', false)
on conflict (id) do update set public = false;

create table public.purchase_receipt_attachments (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.purchase_receipts(id) on delete cascade,
  file_name text not null,
  storage_path text not null unique,
  mime_type text,
  file_size bigint,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

alter table public.purchase_receipt_attachments enable row level security;

create policy purchase_receipt_attachments_admin_all on public.purchase_receipt_attachments
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy purchase_receipts_storage_admin_all on storage.objects
  for all to authenticated
  using (bucket_id = 'purchase-receipts' and public.is_admin())
  with check (bucket_id = 'purchase-receipts' and public.is_admin());
