with numbered as (
  select id, row_number() over (order by id) as sequence_number
  from public.products
  where sku is null or btrim(sku) = ''
)
update public.products as products
set sku = 'PRD-' || lpad(numbered.sequence_number::text, 4, '0')
from numbered
where products.id = numbered.id;

create unique index if not exists products_sku_unique_idx
  on public.products(sku)
  where sku is not null;
