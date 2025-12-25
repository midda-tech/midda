import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getRecipeIcon } from "@/lib/recipeIcons";
import { ReactNode } from "react";

interface RecipeListItemProps {
  title: string;
  icon: number | null;
  tags: string[];
  onClick: () => void;
  action?: ReactNode;
}

export function RecipeListItem({ title, icon, tags, onClick, action }: RecipeListItemProps) {
  return (
    <div
      className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <img src={getRecipeIcon(icon)} alt="" className="h-10 w-10 shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="font-serif text-base font-bold text-foreground block truncate">
          {title}
        </span>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {tags.slice(0, 3).map((tag, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs px-1.5 py-0">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
      {action && (
        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
          {action}
        </div>
      )}
    </div>
  );
}
