import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ViewMode } from "@/hooks/useRecipeViewPreference";

interface ViewToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function ViewToggle({ viewMode, onViewModeChange }: ViewToggleProps) {
  return (
    <div className="flex border border-border rounded-md overflow-hidden">
      <Button
        variant="ghost"
        size="icon"
        className={`rounded-none h-10 w-10 ${viewMode === "card" ? "bg-muted" : ""}`}
        onClick={() => onViewModeChange("card")}
        aria-label="Kortvisning"
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={`rounded-none h-10 w-10 ${viewMode === "list" ? "bg-muted" : ""}`}
        onClick={() => onViewModeChange("list")}
        aria-label="Listevisning"
      >
        <List className="h-4 w-4" />
      </Button>
    </div>
  );
}
