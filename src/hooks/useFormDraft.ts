import { useCallback, useEffect, useRef } from "react";

const DEBOUNCE_MS = 500;

export function useFormDraft<T>(storageKey: string) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const saveDraft = useCallback((data: T) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(data));
      } catch (e) {
        // localStorage might not be available (private browsing)
        console.warn("Could not save draft to localStorage:", e);
      }
    }, DEBOUNCE_MS);
  }, [storageKey]);

  const loadDraft = useCallback((): T | null => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        return JSON.parse(stored) as T;
      }
    } catch (e) {
      console.warn("Could not load draft from localStorage:", e);
    }
    return null;
  }, [storageKey]);

  const clearDraft = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    try {
      localStorage.removeItem(storageKey);
    } catch (e) {
      console.warn("Could not clear draft from localStorage:", e);
    }
  }, [storageKey]);

  const hasDraft = useCallback((): boolean => {
    try {
      return localStorage.getItem(storageKey) !== null;
    } catch {
      return false;
    }
  }, [storageKey]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { saveDraft, loadDraft, clearDraft, hasDraft };
}
