import { useState, useMemo, useCallback } from "react";
import { Json } from "@/integrations/supabase/types";

interface TaggableItem {
  tags: Json;
}

export const useTagFilter = <T extends TaggableItem>(items: T[]) => {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    items.forEach(item => {
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach((tag: string) => tagSet.add(tag));
      }
    });
    return Array.from(tagSet).sort();
  }, [items]);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag) 
        : [...prev, tag]
    );
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedTags([]);
  }, []);

  const filterByTags = useCallback((item: T) => {
    if (selectedTags.length === 0) return true;
    if (!item.tags || !Array.isArray(item.tags)) return false;
    return selectedTags.every(tag => (item.tags as string[]).includes(tag));
  }, [selectedTags]);

  return {
    selectedTags,
    allTags,
    toggleTag,
    clearFilters,
    filterByTags,
  };
};
