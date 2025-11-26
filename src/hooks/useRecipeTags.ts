import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

let cachedTags: string[] | null = null;
let cachePromise: Promise<string[]> | null = null;

export const useRecipeTags = (householdId: string | null) => {
  const [tags, setTags] = useState<string[]>(cachedTags || []);
  const [loading, setLoading] = useState(!cachedTags);

  useEffect(() => {
    if (!householdId) return;

    // Return cached tags immediately if available
    if (cachedTags) {
      setTags(cachedTags);
      setLoading(false);
      return;
    }

    // If already fetching, wait for that promise
    if (cachePromise) {
      cachePromise.then((fetchedTags) => {
        setTags(fetchedTags);
        setLoading(false);
      });
      return;
    }

    // Fetch tags
    cachePromise = fetchTags(householdId);
    cachePromise.then((fetchedTags) => {
      cachedTags = fetchedTags;
      setTags(fetchedTags);
      setLoading(false);
      cachePromise = null;
    });
  }, [householdId]);

  const addTag = (newTag: string) => {
    const trimmedTag = newTag.trim();
    if (!trimmedTag || tags.includes(trimmedTag)) return;
    
    const updatedTags = [...tags, trimmedTag].sort();
    setTags(updatedTags);
    cachedTags = updatedTags;
  };

  return { tags, loading, addTag };
};

async function fetchTags(householdId: string): Promise<string[]> {
  const [systemResult, householdResult] = await Promise.all([
    supabase.from("system_recipes").select("tags"),
    supabase.from("household_recipes").select("tags").eq("household_id", householdId)
  ]);

  const allTags = new Set<string>();
  
  [...(systemResult.data || []), ...(householdResult.data || [])].forEach((recipe) => {
    if (Array.isArray(recipe.tags)) {
      recipe.tags.forEach((tag: string) => {
        if (tag && tag.trim()) {
          allTags.add(tag.trim());
        }
      });
    }
  });

  return Array.from(allTags).sort();
}
