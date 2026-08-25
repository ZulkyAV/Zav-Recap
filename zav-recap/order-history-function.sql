create or replace function public.cancel_order(
  p_sale_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Kamu harus login untuk membatalkan order.';
  end if;

  if not exists (
    select 1
    from public.sales s
    where s.id = p_sale_id
      and s.user_id = v_user_id
  ) then
    raise exception 'Order tidak ditemukan atau bukan milik akun ini.';
  end if;

  delete from public.sale_items
  where sale_id = p_sale_id;

  delete from public.sales
  where id = p_sale_id
    and user_id = v_user_id;
end;
$$;

revoke all on function public.cancel_order(uuid) from public;
grant execute on function public.cancel_order(uuid) to authenticated;

notify pgrst, 'reload schema';
