-- مدير النظام: صلاحية كاملة عبر Supabase Auth + RLS.
insert into public.roles (code, name_ar)
values ('admin', 'مدير النظام')
on conflict (code) do update set name_ar = excluded.name_ar;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.users u
    join public.roles r on r.id = u.role_id
    where u.id = auth.uid()
      and r.code = 'admin'
      and u.status = 'active'
  );
$$;

grant execute on function public.is_admin() to authenticated;

drop policy if exists customers_admin_all on public.customers;
create policy customers_admin_all on public.customers
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists contracts_admin_all on public.contracts;
create policy contracts_admin_all on public.contracts
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists payments_admin_all on public.payments;
create policy payments_admin_all on public.payments
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists audit_logs_admin_all on public.audit_logs;
create policy audit_logs_admin_all on public.audit_logs
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
