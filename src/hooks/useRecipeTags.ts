import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useRecipeTags = (householdId: string | null) => {
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!householdId) return;

    const fetchTags = async () => {
      setLoading(true);
      
      const [systemResult, householdResult] = await Promise.all([
        supabase.from("system_recipes").select("tags"),
        supabase.from("household_recipes").select("tags").eq("household_id", householdId)
      ]);

      const allTags = new Set<string>();
      
      [...(systemResult.data || []), ...(householdResult.data || [])].forEach((recipe) => {
        if (Array.isArray(recipe.tags)) {
          recipe.tags.forEach((tag: string) => {
            if (tag && tag.trim()) {
              allTags.add(tag.trim().toLowerCase());
            }
          });
        }
      });

      setTags(Array.from(allTags).sort());
      setLoading(false);
    };

    fetchTags();
  }, [householdId]);

  return { tags, loading };
};
