alter table public.menus enable row level security;

drop policy if exists "zav_recap_select_own_menus" on public.menus;
create policy "zav_recap_select_own_menus"
on public.menus
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "zav_recap_update_own_menus" on public.menus;
create policy "zav_recap_update_own_menus"
on public.menus
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
