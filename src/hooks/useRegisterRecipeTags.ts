import { supabase } from "@/integrations/supabase/client";

/**
 * Registers tags to the recipe_tags table when saving a recipe.
 * Uses upsert with ignore duplicates to ensure all tags exist in the registry.
 */
export const registerRecipeTags = async (
  householdId: string,
  userId: string,
  tags: string[]
): Promise<void> => {
  if (tags.length === 0) return;

  const normalizedTags = tags
    .map((tag) => tag.toLowerCase().trim())
    .filter((tag) => tag.length > 0);

  if (normalizedTags.length === 0) return;

  // Insert each tag, ignoring duplicates (handled by unique constraint)
  const tagRecords = normalizedTags.map((name) => ({
    household_id: householdId,
    name,
    created_by: userId,
  }));

  // Use individual inserts with onConflict to handle duplicates gracefully
  for (const record of tagRecords) {
    await supabase
      .from("recipe_tags")
      .upsert(record, { onConflict: "household_id,name", ignoreDuplicates: true });
  }
};
