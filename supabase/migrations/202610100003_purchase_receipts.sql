-- فواتير شراء وإدخال مخزني متعددة البنود.
create table if not exists public.purchase_receipts (
  id uuid primary key default gen_random_uuid(),
  receipt_number text unique not null,
  supplier_id uuid not null references public.suppliers(id),
  receipt_date date not null default current_date,
  subtotal bigint not null check(subtotal >= 0),
  status public.record_status not null default 'active',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.purchase_receipt_items (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.purchase_receipts(id) on delete restrict,
  product_id uuid not null references public.products(id),
  quantity integer not null check(quantity > 0),
  unit_cost bigint not null check(unit_cost >= 0),
  total bigint generated always as (quantity * unit_cost) stored
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  movement_type text not null check(movement_type in ('purchase','sale','adjustment')),
  quantity integer not null check(quantity <> 0),
  unit_cost bigint check(unit_cost >= 0),
  purchase_receipt_id uuid references public.purchase_receipts(id),
  created_at timestamptz not null default now()
);

create index if not exists purchase_receipts_supplier_idx on public.purchase_receipts(supplier_id, receipt_date desc);
create index if not exists purchase_items_receipt_idx on public.purchase_receipt_items(receipt_id);
create index if not exists inventory_movements_product_idx on public.inventory_movements(product_id, created_at desc);
