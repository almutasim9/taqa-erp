alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;

drop policy if exists invoices_admin_all on public.invoices;
create policy invoices_admin_all on public.invoices
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists invoice_items_admin_all on public.invoice_items;
create policy invoice_items_admin_all on public.invoice_items
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
