-- Function 1: Toggle item for authenticated users (by list ID)
CREATE OR REPLACE FUNCTION public.toggle_shopping_list_item(
  p_list_id uuid,
  p_item text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_shopping_list jsonb;
  v_checked_items jsonb;
BEGIN
  -- Get and lock the shopping list row
  SELECT shopping_list INTO v_shopping_list
  FROM shopping_lists
  WHERE id = p_list_id
    AND EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = shopping_lists.household_id
        AND household_members.user_id = auth.uid()
    )
  FOR UPDATE;

  IF v_shopping_list IS NULL THEN
    RAISE EXCEPTION 'Shopping list not found or access denied';
  END IF;

  -- Get current checked_items array (default to empty array)
  v_checked_items := COALESCE(v_shopping_list->'checked_items', '[]'::jsonb);

  -- Toggle: if item exists in checked_items, remove it; otherwise add it
  IF v_checked_items @> to_jsonb(p_item) THEN
    v_checked_items := (
      SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
      FROM jsonb_array_elements(v_checked_items) AS elem
      WHERE elem #>> '{}' <> p_item
    );
  ELSE
    v_checked_items := v_checked_items || to_jsonb(p_item);
  END IF;

  -- Update the shopping list with new checked_items
  v_shopping_list := jsonb_set(v_shopping_list, '{checked_items}', v_checked_items);

  UPDATE shopping_lists
  SET shopping_list = v_shopping_list,
      updated_at = now()
  WHERE id = p_list_id;

  RETURN v_shopping_list;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.toggle_shopping_list_item(uuid, text) TO authenticated;

-- Function 2: Toggle item for shared lists (by token)
CREATE OR REPLACE FUNCTION public.toggle_shopping_list_item_by_token(
  p_token uuid,
  p_item text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_shopping_list jsonb;
  v_checked_items jsonb;
BEGIN
  -- Get and lock the shopping list row by token
  SELECT shopping_list INTO v_shopping_list
  FROM shopping_lists
  WHERE share_token = p_token
  FOR UPDATE;

  IF v_shopping_list IS NULL THEN
    RAISE EXCEPTION 'Shopping list not found';
  END IF;

  -- Get current checked_items array (default to empty array)
  v_checked_items := COALESCE(v_shopping_list->'checked_items', '[]'::jsonb);

  -- Toggle: if item exists in checked_items, remove it; otherwise add it
  IF v_checked_items @> to_jsonb(p_item) THEN
    v_checked_items := (
      SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
      FROM jsonb_array_elements(v_checked_items) AS elem
      WHERE elem #>> '{}' <> p_item
    );
  ELSE
    v_checked_items := v_checked_items || to_jsonb(p_item);
  END IF;

  -- Update the shopping list with new checked_items
  v_shopping_list := jsonb_set(v_shopping_list, '{checked_items}', v_checked_items);

  UPDATE shopping_lists
  SET shopping_list = v_shopping_list,
      updated_at = now()
  WHERE share_token = p_token;

  RETURN v_shopping_list;
END;
$$;

-- Grant execute to both anon and authenticated users
GRANT EXECUTE ON FUNCTION public.toggle_shopping_list_item_by_token(uuid, text) TO anon, authenticated;