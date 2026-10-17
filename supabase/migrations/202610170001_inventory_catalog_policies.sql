drop policy if exists suppliers_admin_all on public.suppliers;
create policy suppliers_admin_all on public.suppliers
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists companies_admin_all on public.companies;
create policy companies_admin_all on public.companies
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists products_admin_all on public.products;
create policy products_admin_all on public.products
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
