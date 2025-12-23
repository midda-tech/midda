import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface RecipeTag {
  id: string;
  name: string;
}

export const useRecipeTags = (householdId: string | null) => {
  const [tags, setTags] = useState<RecipeTag[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTags = useCallback(async () => {
    if (!householdId) return;

    setLoading(true);
    
    const { data, error } = await supabase
      .from("recipe_tags")
      .select("id, name")
      .eq("household_id", householdId)
      .order("name");

    if (error) {
      console.error("Error fetching recipe tags:", error);
      setTags([]);
    } else {
      setTags(data || []);
    }
    
    setLoading(false);
  }, [householdId]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const refetch = useCallback(() => {
    fetchTags();
  }, [fetchTags]);

  return { tags, loading, refetch };
};
