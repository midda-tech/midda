-- =====================================================
-- 1. ADD ITEM (authenticated users)
-- =====================================================
CREATE OR REPLACE FUNCTION public.add_shopping_list_item(
  p_list_id uuid,
  p_category_name text,
  p_item text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_shopping_list jsonb;
  v_categories jsonb;
  v_category_idx int;
  v_found boolean := false;
  v_trimmed_item text;
BEGIN
  -- Validate input
  v_trimmed_item := trim(p_item);
  IF v_trimmed_item = '' THEN
    RAISE EXCEPTION 'Item cannot be empty';
  END IF;

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

  v_categories := COALESCE(v_shopping_list->'categories', '[]'::jsonb);

  -- Find the category and add the item
  FOR v_category_idx IN 0..jsonb_array_length(v_categories) - 1 LOOP
    IF v_categories->v_category_idx->>'name' = p_category_name THEN
      v_categories := jsonb_set(
        v_categories,
        ARRAY[v_category_idx::text, 'items'],
        (v_categories->v_category_idx->'items') || to_jsonb(v_trimmed_item)
      );
      v_found := true;
      EXIT;
    END IF;
  END LOOP;

  -- If category not found, create it with the item
  IF NOT v_found THEN
    v_categories := v_categories || jsonb_build_object(
      'name', p_category_name,
      'items', jsonb_build_array(v_trimmed_item)
    );
  END IF;

  v_shopping_list := jsonb_set(v_shopping_list, '{categories}', v_categories);

  UPDATE shopping_lists
  SET shopping_list = v_shopping_list, updated_at = now()
  WHERE id = p_list_id;

  RETURN v_shopping_list;
END;
$$;

-- =====================================================
-- 2. REMOVE ITEM (authenticated users)
-- =====================================================
CREATE OR REPLACE FUNCTION public.remove_shopping_list_item(
  p_list_id uuid,
  p_category_name text,
  p_item_index int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_shopping_list jsonb;
  v_categories jsonb;
  v_category_idx int;
  v_items jsonb;
  v_deleted_item text;
  v_checked_items jsonb;
  v_category_found boolean := false;
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

  v_categories := COALESCE(v_shopping_list->'categories', '[]'::jsonb);

  -- Find the category
  FOR v_category_idx IN 0..jsonb_array_length(v_categories) - 1 LOOP
    IF v_categories->v_category_idx->>'name' = p_category_name THEN
      v_category_found := true;
      v_items := v_categories->v_category_idx->'items';
      
      -- Validate index bounds
      IF p_item_index < 0 OR p_item_index >= jsonb_array_length(v_items) THEN
        RAISE EXCEPTION 'Item index out of bounds';
      END IF;
      
      v_deleted_item := v_items->>p_item_index;
      
      -- Remove item at index
      v_items := (
        SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
        FROM jsonb_array_elements(v_items) WITH ORDINALITY AS t(elem, idx)
        WHERE idx - 1 <> p_item_index
      );
      
      -- If category is now empty, remove it
      IF jsonb_array_length(v_items) = 0 THEN
        v_categories := (
          SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
          FROM jsonb_array_elements(v_categories) WITH ORDINALITY AS t(elem, idx)
          WHERE idx - 1 <> v_category_idx
        );
      ELSE
        v_categories := jsonb_set(v_categories, ARRAY[v_category_idx::text, 'items'], v_items);
      END IF;
      
      EXIT;
    END IF;
  END LOOP;

  IF NOT v_category_found THEN
    RAISE EXCEPTION 'Category not found';
  END IF;

  -- Also remove from checked_items if present
  v_checked_items := COALESCE(v_shopping_list->'checked_items', '[]'::jsonb);
  IF v_deleted_item IS NOT NULL AND v_checked_items @> to_jsonb(v_deleted_item) THEN
    v_checked_items := (
      SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
      FROM jsonb_array_elements(v_checked_items) AS elem
      WHERE elem #>> '{}' <> v_deleted_item
    );
    v_shopping_list := jsonb_set(v_shopping_list, '{checked_items}', v_checked_items);
  END IF;

  v_shopping_list := jsonb_set(v_shopping_list, '{categories}', v_categories);

  UPDATE shopping_lists
  SET shopping_list = v_shopping_list, updated_at = now()
  WHERE id = p_list_id;

  RETURN v_shopping_list;
END;
$$;

-- =====================================================
-- 3. EDIT ITEM (authenticated users)
-- =====================================================
CREATE OR REPLACE FUNCTION public.edit_shopping_list_item(
  p_list_id uuid,
  p_category_name text,
  p_item_index int,
  p_new_value text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_shopping_list jsonb;
  v_categories jsonb;
  v_category_idx int;
  v_items jsonb;
  v_old_value text;
  v_checked_items jsonb;
  v_category_found boolean := false;
  v_trimmed_value text;
BEGIN
  -- Validate input
  v_trimmed_value := trim(p_new_value);
  IF v_trimmed_value = '' THEN
    RAISE EXCEPTION 'Item cannot be empty';
  END IF;

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

  v_categories := COALESCE(v_shopping_list->'categories', '[]'::jsonb);

  -- Find the category and update the item
  FOR v_category_idx IN 0..jsonb_array_length(v_categories) - 1 LOOP
    IF v_categories->v_category_idx->>'name' = p_category_name THEN
      v_category_found := true;
      v_items := v_categories->v_category_idx->'items';
      
      -- Validate index bounds
      IF p_item_index < 0 OR p_item_index >= jsonb_array_length(v_items) THEN
        RAISE EXCEPTION 'Item index out of bounds';
      END IF;
      
      v_old_value := v_items->>p_item_index;
      
      v_categories := jsonb_set(
        v_categories,
        ARRAY[v_category_idx::text, 'items', p_item_index::text],
        to_jsonb(v_trimmed_value)
      );
      EXIT;
    END IF;
  END LOOP;

  IF NOT v_category_found THEN
    RAISE EXCEPTION 'Category not found';
  END IF;

  -- Update checked_items if the old value was checked
  v_checked_items := COALESCE(v_shopping_list->'checked_items', '[]'::jsonb);
  IF v_old_value IS NOT NULL AND v_checked_items @> to_jsonb(v_old_value) THEN
    -- Remove old value and add new value
    v_checked_items := (
      SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
      FROM jsonb_array_elements(v_checked_items) AS elem
      WHERE elem #>> '{}' <> v_old_value
    );
    v_checked_items := v_checked_items || to_jsonb(v_trimmed_value);
    v_shopping_list := jsonb_set(v_shopping_list, '{checked_items}', v_checked_items);
  END IF;

  v_shopping_list := jsonb_set(v_shopping_list, '{categories}', v_categories);

  UPDATE shopping_lists
  SET shopping_list = v_shopping_list, updated_at = now()
  WHERE id = p_list_id;

  RETURN v_shopping_list;
END;
$$;

-- =====================================================
-- 4. ADD ITEM BY TOKEN (shared lists)
-- =====================================================
CREATE OR REPLACE FUNCTION public.add_shopping_list_item_by_token(
  p_token uuid,
  p_category_name text,
  p_item text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_shopping_list jsonb;
  v_categories jsonb;
  v_category_idx int;
  v_found boolean := false;
  v_trimmed_item text;
BEGIN
  -- Validate input
  v_trimmed_item := trim(p_item);
  IF v_trimmed_item = '' THEN
    RAISE EXCEPTION 'Item cannot be empty';
  END IF;

  SELECT shopping_list INTO v_shopping_list
  FROM shopping_lists
  WHERE share_token = p_token
  FOR UPDATE;

  IF v_shopping_list IS NULL THEN
    RAISE EXCEPTION 'Shopping list not found';
  END IF;

  v_categories := COALESCE(v_shopping_list->'categories', '[]'::jsonb);

  FOR v_category_idx IN 0..jsonb_array_length(v_categories) - 1 LOOP
    IF v_categories->v_category_idx->>'name' = p_category_name THEN
      v_categories := jsonb_set(
        v_categories,
        ARRAY[v_category_idx::text, 'items'],
        (v_categories->v_category_idx->'items') || to_jsonb(v_trimmed_item)
      );
      v_found := true;
      EXIT;
    END IF;
  END LOOP;

  IF NOT v_found THEN
    v_categories := v_categories || jsonb_build_object(
      'name', p_category_name,
      'items', jsonb_build_array(v_trimmed_item)
    );
  END IF;

  v_shopping_list := jsonb_set(v_shopping_list, '{categories}', v_categories);

  UPDATE shopping_lists
  SET shopping_list = v_shopping_list, updated_at = now()
  WHERE share_token = p_token;

  RETURN v_shopping_list;
END;
$$;

-- =====================================================
-- 5. REMOVE ITEM BY TOKEN (shared lists)
-- =====================================================
CREATE OR REPLACE FUNCTION public.remove_shopping_list_item_by_token(
  p_token uuid,
  p_category_name text,
  p_item_index int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_shopping_list jsonb;
  v_categories jsonb;
  v_category_idx int;
  v_items jsonb;
  v_deleted_item text;
  v_checked_items jsonb;
  v_category_found boolean := false;
BEGIN
  SELECT shopping_list INTO v_shopping_list
  FROM shopping_lists
  WHERE share_token = p_token
  FOR UPDATE;

  IF v_shopping_list IS NULL THEN
    RAISE EXCEPTION 'Shopping list not found';
  END IF;

  v_categories := COALESCE(v_shopping_list->'categories', '[]'::jsonb);

  FOR v_category_idx IN 0..jsonb_array_length(v_categories) - 1 LOOP
    IF v_categories->v_category_idx->>'name' = p_category_name THEN
      v_category_found := true;
      v_items := v_categories->v_category_idx->'items';
      
      -- Validate index bounds
      IF p_item_index < 0 OR p_item_index >= jsonb_array_length(v_items) THEN
        RAISE EXCEPTION 'Item index out of bounds';
      END IF;
      
      v_deleted_item := v_items->>p_item_index;
      
      v_items := (
        SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
        FROM jsonb_array_elements(v_items) WITH ORDINALITY AS t(elem, idx)
        WHERE idx - 1 <> p_item_index
      );
      
      IF jsonb_array_length(v_items) = 0 THEN
        v_categories := (
          SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
          FROM jsonb_array_elements(v_categories) WITH ORDINALITY AS t(elem, idx)
          WHERE idx - 1 <> v_category_idx
        );
      ELSE
        v_categories := jsonb_set(v_categories, ARRAY[v_category_idx::text, 'items'], v_items);
      END IF;
      
      EXIT;
    END IF;
  END LOOP;

  IF NOT v_category_found THEN
    RAISE EXCEPTION 'Category not found';
  END IF;

  v_checked_items := COALESCE(v_shopping_list->'checked_items', '[]'::jsonb);
  IF v_deleted_item IS NOT NULL AND v_checked_items @> to_jsonb(v_deleted_item) THEN
    v_checked_items := (
      SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
      FROM jsonb_array_elements(v_checked_items) AS elem
      WHERE elem #>> '{}' <> v_deleted_item
    );
    v_shopping_list := jsonb_set(v_shopping_list, '{checked_items}', v_checked_items);
  END IF;

  v_shopping_list := jsonb_set(v_shopping_list, '{categories}', v_categories);

  UPDATE shopping_lists
  SET shopping_list = v_shopping_list, updated_at = now()
  WHERE share_token = p_token;

  RETURN v_shopping_list;
END;
$$;

-- =====================================================
-- 6. EDIT ITEM BY TOKEN (shared lists)
-- =====================================================
CREATE OR REPLACE FUNCTION public.edit_shopping_list_item_by_token(
  p_token uuid,
  p_category_name text,
  p_item_index int,
  p_new_value text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_shopping_list jsonb;
  v_categories jsonb;
  v_category_idx int;
  v_items jsonb;
  v_old_value text;
  v_checked_items jsonb;
  v_category_found boolean := false;
  v_trimmed_value text;
BEGIN
  -- Validate input
  v_trimmed_value := trim(p_new_value);
  IF v_trimmed_value = '' THEN
    RAISE EXCEPTION 'Item cannot be empty';
  END IF;

  SELECT shopping_list INTO v_shopping_list
  FROM shopping_lists
  WHERE share_token = p_token
  FOR UPDATE;

  IF v_shopping_list IS NULL THEN
    RAISE EXCEPTION 'Shopping list not found';
  END IF;

  v_categories := COALESCE(v_shopping_list->'categories', '[]'::jsonb);

  FOR v_category_idx IN 0..jsonb_array_length(v_categories) - 1 LOOP
    IF v_categories->v_category_idx->>'name' = p_category_name THEN
      v_category_found := true;
      v_items := v_categories->v_category_idx->'items';
      
      -- Validate index bounds
      IF p_item_index < 0 OR p_item_index >= jsonb_array_length(v_items) THEN
        RAISE EXCEPTION 'Item index out of bounds';
      END IF;
      
      v_old_value := v_items->>p_item_index;
      
      v_categories := jsonb_set(
        v_categories,
        ARRAY[v_category_idx::text, 'items', p_item_index::text],
        to_jsonb(v_trimmed_value)
      );
      EXIT;
    END IF;
  END LOOP;

  IF NOT v_category_found THEN
    RAISE EXCEPTION 'Category not found';
  END IF;

  v_checked_items := COALESCE(v_shopping_list->'checked_items', '[]'::jsonb);
  IF v_old_value IS NOT NULL AND v_checked_items @> to_jsonb(v_old_value) THEN
    v_checked_items := (
      SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
      FROM jsonb_array_elements(v_checked_items) AS elem
      WHERE elem #>> '{}' <> v_old_value
    );
    v_checked_items := v_checked_items || to_jsonb(v_trimmed_value);
    v_shopping_list := jsonb_set(v_shopping_list, '{checked_items}', v_checked_items);
  END IF;

  v_shopping_list := jsonb_set(v_shopping_list, '{categories}', v_categories);

  UPDATE shopping_lists
  SET shopping_list = v_shopping_list, updated_at = now()
  WHERE share_token = p_token;

  RETURN v_shopping_list;
END;
$$;

-- =====================================================
-- GRANT EXECUTE PERMISSIONS
-- =====================================================

-- Authenticated functions
GRANT EXECUTE ON FUNCTION add_shopping_list_item(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_shopping_list_item(uuid, text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION edit_shopping_list_item(uuid, text, int, text) TO authenticated;

-- Token functions (shared access - needs anon for non-logged-in users)
GRANT EXECUTE ON FUNCTION add_shopping_list_item_by_token(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION remove_shopping_list_item_by_token(uuid, text, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION edit_shopping_list_item_by_token(uuid, text, int, text) TO anon, authenticated;