import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getRecipeIcon } from "@/lib/recipeIcons";

interface IconSelectorProps {
  selectedIcon: number;
  onIconSelect: (iconNum: number) => void;
}

export const IconSelector = ({ selectedIcon, onIconSelect }: IconSelectorProps) => {
  const [open, setOpen] = useState(false);

  const handleIconClick = (iconNum: number) => {
    onIconSelect(iconNum);
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-3">
      <div className="h-12 w-12 rounded-lg border-2 border-border bg-card p-2 flex-shrink-0">
        <img src={getRecipeIcon(selectedIcon)} alt="" className="w-full h-full object-contain" />
      </div>
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="flex-1 justify-start h-12"
          >
            <span className="text-muted-foreground">Velg ikon for oppskriften</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto max-w-[320px] p-3" align="start">
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((iconNum) => (
              <button
                key={iconNum}
                type="button"
                onClick={() => handleIconClick(iconNum)}
                className={`h-12 w-12 rounded-lg border-2 p-2 transition-all hover:scale-105 ${
                  selectedIcon === iconNum
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/50"
                }`}
              >
                <img src={getRecipeIcon(iconNum)} alt="" className="w-full h-full object-contain" />
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
