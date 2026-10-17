insert into storage.buckets (id, name, public)
values ('invoice-attachments', 'invoice-attachments', false)
on conflict (id) do update set public = false;

create table public.invoice_attachments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  category text not null check (category in ('identity','contract','payment_receipt','customer_signature','staff_signature','other')),
  file_name text not null,
  storage_path text not null unique,
  mime_type text,
  file_size bigint,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

alter table public.invoice_attachments enable row level security;

create policy invoice_attachments_admin_all on public.invoice_attachments
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy invoice_attachments_storage_admin_all on storage.objects
  for all to authenticated
  using (bucket_id = 'invoice-attachments' and public.is_admin())
  with check (bucket_id = 'invoice-attachments' and public.is_admin());
