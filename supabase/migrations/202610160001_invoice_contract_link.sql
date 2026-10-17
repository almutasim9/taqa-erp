alter table public.contracts
  add column if not exists invoice_id uuid references public.invoices(id);

create index if not exists contracts_invoice_idx
  on public.contracts(invoice_id);
