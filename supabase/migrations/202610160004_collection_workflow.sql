alter table public.installments enable row level security;
alter table public.payment_allocations enable row level security;
alter table public.receipts enable row level security;

drop policy if exists installments_admin_all on public.installments;
create policy installments_admin_all on public.installments
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists payment_allocations_admin_all on public.payment_allocations;
create policy payment_allocations_admin_all on public.payment_allocations
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists receipts_admin_all on public.receipts;
create policy receipts_admin_all on public.receipts
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.record_payment(
  p_customer_id uuid,
  p_invoice_id uuid,
  p_installment_id uuid,
  p_amount bigint,
  p_payment_method public.payment_method,
  p_payment_date date,
  p_notes text default null
)
returns table(payment_id uuid, payment_number text, receipt_number text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment_id uuid;
  v_payment_number text;
  v_receipt_number text;
  v_contract_id uuid;
  v_invoice_id uuid := p_invoice_id;
  v_original_amount bigint;
  v_allocated bigint;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'payment amount must be greater than zero';
  end if;
  if p_invoice_id is null and p_installment_id is null then
    raise exception 'invoice or installment is required';
  end if;

  if p_installment_id is not null then
    select i.contract_id, i.original_amount, c.invoice_id
      into v_contract_id, v_original_amount, v_invoice_id
    from public.installments i
    join public.contracts c on c.id = i.contract_id
    where i.id = p_installment_id;
    if v_contract_id is null then
      raise exception 'installment not found';
    end if;
    if v_invoice_id is null and p_customer_id is null then
      raise exception 'customer is required';
    end if;
    select coalesce(sum(pa.amount), 0) into v_allocated
    from public.payment_allocations pa
    join public.payments p on p.id = pa.payment_id
    where pa.installment_id = p_installment_id and p.status = 'active';
    if p_amount > greatest(v_original_amount - v_allocated, 0) then
      raise exception 'payment exceeds installment balance';
    end if;
  end if;

  v_payment_number := 'PAY-' || to_char(coalesce(p_payment_date, current_date), 'YYYY') || '-' || floor(extract(epoch from clock_timestamp()) * 1000)::bigint;
  v_receipt_number := 'REC-' || to_char(coalesce(p_payment_date, current_date), 'YYYY') || '-' || floor(extract(epoch from clock_timestamp()) * 1000)::bigint;

  insert into public.payments (
    payment_number, customer_id, contract_id, invoice_id, amount, payment_date,
    payment_method, status, received_by, notes
  ) values (
    v_payment_number, p_customer_id, v_contract_id, v_invoice_id, p_amount,
    coalesce(p_payment_date, current_date), p_payment_method, 'active', auth.uid(), p_notes
  ) returning id into v_payment_id;

  insert into public.payment_allocations (payment_id, installment_id, invoice_id, amount)
  values (v_payment_id, p_installment_id, case when p_installment_id is null then p_invoice_id else null end, p_amount);

  insert into public.receipts (receipt_number, payment_id, issued_by)
  values (v_receipt_number, v_payment_id, auth.uid());

  if p_installment_id is not null then
    select coalesce(sum(pa.amount), 0) into v_allocated
    from public.payment_allocations pa
    join public.payments p on p.id = pa.payment_id
    where pa.installment_id = p_installment_id and p.status = 'active';
    update public.installments
    set status = case when v_allocated >= original_amount then 'paid'::public.installment_status else 'partially_paid'::public.installment_status end
    where id = p_installment_id;
  elsif p_invoice_id is not null then
    select coalesce(sum(pa.amount), 0) into v_allocated
    from public.payment_allocations pa
    join public.payments p on p.id = pa.payment_id
    where pa.invoice_id = p_invoice_id and p.status = 'active';
    update public.invoices
    set status = case when v_allocated >= grand_total then 'completed'::public.record_status else 'active'::public.record_status end
    where id = p_invoice_id;
  end if;

  return query select v_payment_id, v_payment_number, v_receipt_number;
end;
$$;

grant execute on function public.record_payment(uuid, uuid, uuid, bigint, public.payment_method, date, text) to authenticated;
