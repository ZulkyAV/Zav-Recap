create or replace function public.create_order(
  p_business_id uuid,
  p_items jsonb,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_sale_id uuid;
  v_total numeric(14,2);
begin
  if v_user_id is null then
    raise exception 'Kamu harus login untuk menyimpan order.';
  end if;

  if not exists (
    select 1
    from public.businesses b
    where b.id = p_business_id
      and b.user_id = v_user_id
  ) then
    raise exception 'Usaha tidak ditemukan atau bukan milik akun ini.';
  end if;

  if p_items is null
    or jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) = 0 then
    raise exception 'Order belum memiliki produk.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) item
    where jsonb_typeof(item -> 'menu_id') <> 'string'
      or jsonb_typeof(item -> 'quantity') <> 'number'
      or (item ->> 'quantity')::numeric <= 0
      or (item ->> 'quantity')::numeric <> trunc((item ->> 'quantity')::numeric)
  ) then
    raise exception 'Data jumlah produk tidak valid.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) item
    left join public.menus m
      on m.id = (item ->> 'menu_id')::uuid
    where m.id is null
      or m.user_id <> v_user_id
      or m.business_id <> p_business_id
      or not m.is_available
  ) then
    raise exception 'Salah satu menu tidak tersedia untuk usaha ini.';
  end if;

  with requested_items as (
    select
      (item ->> 'menu_id')::uuid as menu_id,
      sum((item ->> 'quantity')::integer)::integer as quantity
    from jsonb_array_elements(p_items) item
    group by (item ->> 'menu_id')::uuid
  )
  select coalesce(sum(m.price * r.quantity), 0)::numeric(14,2)
  into v_total
  from requested_items r
  join public.menus m on m.id = r.menu_id;

  if v_total <= 0 then
    raise exception 'Total order harus lebih dari Rp0.';
  end if;

  insert into public.sales (
    user_id,
    business_id,
    total_amount,
    note
  )
  values (
    v_user_id,
    p_business_id,
    v_total,
    nullif(trim(p_note), '')
  )
  returning id into v_sale_id;

  insert into public.sale_items (
    sale_id,
    menu_id,
    quantity,
    unit_price
  )
  with requested_items as (
    select
      (item ->> 'menu_id')::uuid as menu_id,
      sum((item ->> 'quantity')::integer)::integer as quantity
    from jsonb_array_elements(p_items) item
    group by (item ->> 'menu_id')::uuid
  )
  select
    v_sale_id,
    m.id,
    r.quantity,
    m.price
  from requested_items r
  join public.menus m on m.id = r.menu_id;

  return v_sale_id;
end;
$$;

revoke all on function public.create_order(uuid, jsonb, text) from public;
grant execute on function public.create_order(uuid, jsonb, text) to authenticated;

notify pgrst, 'reload schema';
