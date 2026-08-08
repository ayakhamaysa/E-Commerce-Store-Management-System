-- ============================================================
-- قاعدة متجر مستقل لعميل واحد
-- شغّلي الملف كاملًا مرة واحدة في Supabase SQL Editor.
-- لا يحذف جداول المشروع القديم؛ يستخدم أسماء shop_ مستقلة وآمنة.
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.shop_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.shop_settings (
  id smallint primary key default 1 check (id = 1),
  hero_image_url text,
  logo_image_url text,
  updated_at timestamptz not null default now()
);

alter table public.shop_settings add column if not exists logo_image_url text;

create table if not exists public.shop_slides (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  image_path text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.shop_settings (id) values (1)
on conflict (id) do nothing;

create table if not exists public.shop_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);


-- خصومات الأقسام: الخصم ينطبق على جميع منتجات القسم
alter table public.shop_categories add column if not exists discount_percent numeric(5,2) not null default 0 check (discount_percent between 0 and 100);
alter table public.shop_categories add column if not exists discount_active boolean not null default false;

create table if not exists public.shop_products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.shop_categories(id) on delete restrict,
  name text not null,
  price numeric(12,2) not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  image_url text,
  image_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shop_products add column if not exists short_description text;
alter table public.shop_products add column if not exists description text;
alter table public.shop_products add column if not exists colors text[] not null default '{}';
alter table public.shop_products add column if not exists sizes text[] not null default '{}';
alter table public.shop_products add column if not exists shoe_sizes text[] not null default '{}';
alter table public.shop_products add column if not exists product_type text not null default 'regular';
alter table public.shop_products add column if not exists discount_percent numeric(5,2) not null default 0 check (discount_percent >= 0 and discount_percent <= 100);
alter table public.shop_products add column if not exists discount_active boolean not null default false;
alter table public.shop_products add column if not exists sold_count integer not null default 0 check (sold_count >= 0);

create table if not exists public.shop_product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.shop_products(id) on delete cascade,
  color text,
  option_value text,
  stock integer not null default 0 check (stock >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.shop_product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.shop_products(id) on delete cascade,
  image_url text not null,
  image_path text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.shop_product_images add column if not exists color text;

create or replace function public.is_shop_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.shop_admins where user_id = auth.uid()
  );
$$;

grant execute on function public.is_shop_admin() to anon, authenticated;

alter table public.shop_admins enable row level security;
alter table public.shop_settings enable row level security;
alter table public.shop_categories enable row level security;
alter table public.shop_products enable row level security;
alter table public.shop_slides enable row level security;
alter table public.shop_product_images enable row level security;
alter table public.shop_product_variants enable row level security;

drop policy if exists "admin reads own access" on public.shop_admins;
create policy "admin reads own access" on public.shop_admins
for select to authenticated using (user_id = auth.uid());

drop policy if exists "public reads settings" on public.shop_settings;
create policy "public reads settings" on public.shop_settings
for select to anon, authenticated using (true);

drop policy if exists "admin updates settings" on public.shop_settings;
create policy "admin updates settings" on public.shop_settings
for all to authenticated using (public.is_shop_admin()) with check (public.is_shop_admin());

drop policy if exists "public reads active slides" on public.shop_slides;
create policy "public reads active slides" on public.shop_slides
for select to anon, authenticated using (is_active or public.is_shop_admin());

drop policy if exists "admin manages slides" on public.shop_slides;
create policy "admin manages slides" on public.shop_slides
for all to authenticated using (public.is_shop_admin()) with check (public.is_shop_admin());

drop policy if exists "public reads active categories" on public.shop_categories;
create policy "public reads active categories" on public.shop_categories
for select to anon, authenticated using (is_active or public.is_shop_admin());

drop policy if exists "admin manages categories" on public.shop_categories;
create policy "admin manages categories" on public.shop_categories
for all to authenticated using (public.is_shop_admin()) with check (public.is_shop_admin());

drop policy if exists "public reads active products" on public.shop_products;
create policy "public reads active products" on public.shop_products
for select to anon, authenticated using (is_active or public.is_shop_admin());

drop policy if exists "admin manages products" on public.shop_products;
create policy "admin manages products" on public.shop_products
for all to authenticated using (public.is_shop_admin()) with check (public.is_shop_admin());

drop policy if exists "public reads product images" on public.shop_product_images;
create policy "public reads product images" on public.shop_product_images
for select to anon, authenticated using (true);

drop policy if exists "admin manages product images" on public.shop_product_images;
create policy "admin manages product images" on public.shop_product_images
for all to authenticated using (public.is_shop_admin()) with check (public.is_shop_admin());

drop policy if exists "public reads product variants" on public.shop_product_variants;
create policy "public reads product variants" on public.shop_product_variants
for select to anon, authenticated using (true);

drop policy if exists "admin manages product variants" on public.shop_product_variants;
create policy "admin manages product variants" on public.shop_product_variants
for all to authenticated using (public.is_shop_admin()) with check (public.is_shop_admin());

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('shop-images','shop-images',true,7340032,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public reads shop images" on storage.objects;
create policy "public reads shop images" on storage.objects
for select to public using (bucket_id = 'shop-images');

drop policy if exists "admin uploads shop images" on storage.objects;
create policy "admin uploads shop images" on storage.objects
for insert to authenticated with check (
  bucket_id = 'shop-images' and public.is_shop_admin()
);

drop policy if exists "admin updates shop images" on storage.objects;
create policy "admin updates shop images" on storage.objects
for update to authenticated using (
  bucket_id = 'shop-images' and public.is_shop_admin()
) with check (
  bucket_id = 'shop-images' and public.is_shop_admin()
);

drop policy if exists "admin deletes shop images" on storage.objects;
create policy "admin deletes shop images" on storage.objects
for delete to authenticated using (
  bucket_id = 'shop-images' and public.is_shop_admin()
);

-- ============================================================
-- الخطوة الأخيرة بعد إنشاء مستخدم العميل من Authentication > Users:
-- انسخي UID الخاص به، ثم شغّلي السطر التالي بعد استبدال النص بين الأقواس.
-- ============================================================
-- insert into public.shop_admins (user_id)
-- values ('ضعي-هنا-UID-العميل');

-- ============================================================
-- الطلبات والسلة وإتمام الشراء
-- يمكن تشغيل القسم التالي أيضًا فوق نسخة سبق تجهيزها.
-- ============================================================

create table if not exists public.shop_orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated by default as identity unique,
  customer_name text not null,
  customer_phone text not null,
  customer_city text not null,
  customer_address text not null,
  notes text,
  payment_method text not null check (payment_method in ('cash','visa')),
  payment_status text not null default 'pending' check (payment_status in ('pending','paid','failed')),
  status text not null default 'new' check (status in ('new','preparing','shipped','completed','cancelled')),
  subtotal numeric(12,2) not null check (subtotal >= 0),
  delivery_fee numeric(12,2) not null default 0 check (delivery_fee >= 0),
  total numeric(12,2) not null check (total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shop_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.shop_orders(id) on delete cascade,
  product_id uuid references public.shop_products(id) on delete set null,
  product_name text not null,
  unit_price numeric(12,2) not null,
  quantity integer not null check (quantity > 0),
  line_total numeric(12,2) not null
);

alter table public.shop_order_items add column if not exists selected_options text;
alter table public.shop_order_items add column if not exists selected_variant_id uuid;
alter table public.shop_order_items add column if not exists image_url text;

update public.shop_order_items oi set image_url=p.image_url
from public.shop_products p
where oi.product_id=p.id and oi.image_url is null;

alter table public.shop_orders enable row level security;
alter table public.shop_order_items enable row level security;

drop policy if exists "admin reads orders" on public.shop_orders;
create policy "admin reads orders" on public.shop_orders
for select to authenticated using (public.is_shop_admin());

drop policy if exists "admin updates orders" on public.shop_orders;
create policy "admin updates orders" on public.shop_orders
for update to authenticated using (public.is_shop_admin()) with check (public.is_shop_admin());

drop policy if exists "admin deletes orders" on public.shop_orders;
create policy "admin deletes orders" on public.shop_orders
for delete to authenticated using (public.is_shop_admin());

drop policy if exists "admin reads order items" on public.shop_order_items;
create policy "admin reads order items" on public.shop_order_items
for select to authenticated using (public.is_shop_admin());

create or replace function public.create_shop_order(
  p_customer_name text,
  p_customer_phone text,
  p_customer_city text,
  p_customer_address text,
  p_customer_notes text,
  p_payment_method text,
  p_delivery_fee numeric,
  p_items jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_product public.shop_products%rowtype;
  v_variant public.shop_product_variants%rowtype;
  v_quantity integer;
  v_subtotal numeric(12,2) := 0;
  v_delivery numeric(12,2) := greatest(coalesce(p_delivery_fee,0),0);
  v_order public.shop_orders%rowtype;
begin
  if nullif(trim(p_customer_name),'') is null or
     nullif(trim(p_customer_phone),'') is null or
     nullif(trim(p_customer_city),'') is null or
     nullif(trim(p_customer_address),'') is null then
    raise exception 'بيانات التوصيل غير مكتملة';
  end if;
  if p_payment_method not in ('cash','visa') then
    raise exception 'طريقة الدفع غير صحيحة';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 50 then
    raise exception 'السلة غير صحيحة';
  end if;
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity := greatest(coalesce((v_item->>'quantity')::integer,0),0);
    if v_quantity < 1 then raise exception 'كمية غير صحيحة'; end if;

    select * into v_product from public.shop_products
    where id = (v_item->>'product_id')::uuid and is_active = true
    for update;

    if not found then raise exception 'أحد المنتجات غير متوفر'; end if;
    if nullif(v_item->>'selected_variant_id','') is not null then
      select * into v_variant from public.shop_product_variants
      where id=(v_item->>'selected_variant_id')::uuid and product_id=v_product.id for update;
      if not found or v_variant.stock < v_quantity then raise exception 'الخيار المحدد نفد من المخزون'; end if;
    end if;
    if v_product.stock < v_quantity then raise exception 'الكمية المتوفرة من % هي % فقط', v_product.name, v_product.stock; end if;
    v_subtotal := v_subtotal + ((case when exists (select 1 from public.shop_categories c where c.id=v_product.category_id and c.discount_active and c.discount_percent > 0) then round(v_product.price * (1 - (select c.discount_percent from public.shop_categories c where c.id=v_product.category_id) / 100.0), 2) else v_product.price end) * v_quantity);
  end loop;

  insert into public.shop_orders (
    customer_name,customer_phone,customer_city,customer_address,notes,
    payment_method,payment_status,status,subtotal,delivery_fee,total
  ) values (
    trim(p_customer_name),trim(p_customer_phone),trim(p_customer_city),trim(p_customer_address),nullif(trim(p_customer_notes),''),
    p_payment_method,'pending','new',v_subtotal,v_delivery,v_subtotal+v_delivery
  ) returning * into v_order;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item->>'quantity')::integer;
    select * into v_product from public.shop_products where id = (v_item->>'product_id')::uuid;
    insert into public.shop_order_items (order_id,product_id,product_name,unit_price,quantity,line_total,selected_options,selected_variant_id,image_url)
    values (v_order.id,v_product.id,v_product.name,(case when exists (select 1 from public.shop_categories c where c.id=v_product.category_id and c.discount_active and c.discount_percent > 0) then round(v_product.price * (1 - (select c.discount_percent from public.shop_categories c where c.id=v_product.category_id) / 100.0), 2) else v_product.price end),v_quantity,(case when exists (select 1 from public.shop_categories c where c.id=v_product.category_id and c.discount_active and c.discount_percent > 0) then round(v_product.price * (1 - (select c.discount_percent from public.shop_categories c where c.id=v_product.category_id) / 100.0), 2) else v_product.price end)*v_quantity,nullif(v_item->>'selected_options',''),nullif(v_item->>'selected_variant_id','')::uuid,v_product.image_url);
    if nullif(v_item->>'selected_variant_id','') is not null then
      update public.shop_product_variants set stock=stock-v_quantity where id=(v_item->>'selected_variant_id')::uuid;
    end if;
    update public.shop_products set stock = stock-v_quantity,sold_count=sold_count+v_quantity,updated_at=now() where id=v_product.id;
  end loop;

  return jsonb_build_object('order_id',v_order.id,'order_number',v_order.order_number);
end;
$$;

revoke all on function public.create_shop_order(text,text,text,text,text,text,numeric,jsonb) from public;
grant execute on function public.create_shop_order(text,text,text,text,text,text,numeric,jsonb) to anon,authenticated;

notify pgrst, 'reload schema';
