alter table public.businesses enable row level security;
alter table public.capital_entries enable row level security;

drop policy if exists "zav_recap_update_own_business" on public.businesses;
create policy "zav_recap_update_own_business"
on public.businesses
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "zav_recap_select_own_capital" on public.capital_entries;
create policy "zav_recap_select_own_capital"
on public.capital_entries
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "zav_recap_insert_own_capital" on public.capital_entries;
create policy "zav_recap_insert_own_capital"
on public.capital_entries
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.businesses b
    where b.id = capital_entries.business_id
      and b.user_id = auth.uid()
  )
);
