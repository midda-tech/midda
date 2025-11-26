-- Create a security definer function to check if two users share a household
create or replace function public.users_share_household(_user_id_1 uuid, _user_id_2 uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members hm1
    inner join public.household_members hm2
      on hm1.household_id = hm2.household_id
    where hm1.user_id = _user_id_1
      and hm2.user_id = _user_id_2
  )
$$;

-- Drop the old restrictive policy
drop policy if exists "Users can view own profile" on public.profiles;

-- Create new policies for profiles
create policy "Users can view own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "Users can view profiles of household members"
on public.profiles
for select
to authenticated
using (public.users_share_household(auth.uid(), id));