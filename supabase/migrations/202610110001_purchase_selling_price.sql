alter table public.purchase_receipt_items add column if not exists selling_price bigint not null default 0 check(selling_price >= 0);
