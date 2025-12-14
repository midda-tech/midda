import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { X, Check } from "lucide-react";

interface TagSelectorProps {
  selectedTags: string[];
  availableTags: string[];
  onTagToggle: (tag: string) => void;
  onTagRemove: (tag: string) => void;
  onNewTag: (tag: string) => void;
}

export const TagSelector = ({
  selectedTags,
  availableTags,
  onTagToggle,
  onTagRemove,
  onNewTag,
}: TagSelectorProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-start h-auto min-h-[2.5rem] py-2 px-3 gap-1 flex-wrap"
        >
          {selectedTags.length > 0 ? (
            <>
              {selectedTags.map((tag) => (
                <Badge
                  key={tag}
                  variant="default"
                  className="gap-1 shrink-0"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTagRemove(tag);
                    }}
                    className="ml-0.5 hover:opacity-70"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <span className="text-muted-foreground text-sm">Legg til...</span>
            </>
          ) : (
            <span className="text-muted-foreground">Velg eller legg til tag</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start" side="top">
        <Command>
          <CommandInput 
            placeholder="Søk eller skriv ny tag..." 
            autoCapitalize="off"
            className="lowercase"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const value = e.currentTarget.value.toLowerCase().trim();
                if (value) {
                  onNewTag(value);
                  e.currentTarget.value = "";
                }
              }
            }}
          />
          <CommandList className="max-h-[120px] overflow-y-auto">
            <CommandEmpty className="py-2 px-3 text-sm">
              Trykk Enter for å legge til ny tag
            </CommandEmpty>
            <CommandGroup>
              {availableTags.map((tag) => (
                <CommandItem
                  key={tag}
                  value={tag}
                  onSelect={() => onTagToggle(tag)}
                >
                  <Check
                    className={`mr-2 h-4 w-4 ${
                      selectedTags.includes(tag) ? "opacity-100" : "opacity-0"
                    }`}
                  />
                  {tag}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
