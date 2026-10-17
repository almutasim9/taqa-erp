alter table public.financiers enable row level security;
alter table public.financier_agreement_versions enable row level security;

drop policy if exists financiers_admin_all on public.financiers;
create policy financiers_admin_all on public.financiers
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists financier_agreements_admin_all on public.financier_agreement_versions;
create policy financier_agreements_admin_all on public.financier_agreement_versions
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
