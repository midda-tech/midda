-- Fix: Change view from security_invoker to security_definer
-- The view's WHERE clause already ensures users only see household members
-- But with security_invoker, the profiles RLS blocks viewing other users

DROP VIEW IF EXISTS public.household_member_profiles;

CREATE VIEW public.household_member_profiles
WITH (security_barrier = true)
AS
SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.current_household_id
FROM profiles p
WHERE EXISTS (
    SELECT 1
    FROM household_members hm1
    JOIN household_members hm2 ON hm1.household_id = hm2.household_id
    WHERE hm1.user_id = auth.uid() 
    AND hm2.user_id = p.id
);

-- Grant access to authenticated users
GRANT SELECT ON public.household_member_profiles TO authenticated;