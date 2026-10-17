-- مخزن شمس ERP: فصل الشركة/الماركة عن المورد وربط المنتجات بهما.
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  phone text,
  address text,
  notes text,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  phone text,
  address text,
  notes text,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now()
);

alter table public.products add column if not exists company_id uuid references public.companies(id);
alter table public.products add column if not exists supplier_id uuid references public.suppliers(id);
create index if not exists products_company_idx on public.products(company_id);
create index if not exists products_supplier_idx on public.products(supplier_id);

alter table public.companies enable row level security;
alter table public.suppliers enable row level security;
alter table public.products enable row level security;
