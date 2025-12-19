-- Add share_token column for shareable links
ALTER TABLE public.shopping_lists 
ADD COLUMN share_token uuid DEFAULT NULL;

-- Create unique index for share_token lookups
CREATE UNIQUE INDEX idx_shopping_lists_share_token 
ON public.shopping_lists(share_token) 
WHERE share_token IS NOT NULL;

-- Function to get a shopping list by share token (no auth required)
CREATE OR REPLACE FUNCTION public.get_shopping_list_by_token(p_token uuid)
RETURNS TABLE (
  id uuid,
  title text,
  shopping_list jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    title,
    shopping_list,
    created_at,
    updated_at
  FROM public.shopping_lists
  WHERE share_token = p_token;
$$;

-- Function to update a shopping list by share token (no auth required)
CREATE OR REPLACE FUNCTION public.update_shopping_list_by_token(p_token uuid, p_shopping_list jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.shopping_lists
  SET shopping_list = p_shopping_list,
      updated_at = now()
  WHERE share_token = p_token;
  
  RETURN FOUND;
END;
$$;

-- Grant execute permissions to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.get_shopping_list_by_token(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_shopping_list_by_token(uuid, jsonb) TO anon, authenticated;