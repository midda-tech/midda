import { useState, useEffect } from "react";

export type ViewMode = "card" | "list";

const STORAGE_KEY = "recipeViewMode";

export function useRecipeViewPreference() {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored === "card" || stored === "list") ? stored : "card";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, viewMode);
  }, [viewMode]);

  return { viewMode, setViewMode };
}
