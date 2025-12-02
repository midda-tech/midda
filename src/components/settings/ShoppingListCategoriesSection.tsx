import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ListOrdered, GripVertical, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface ShoppingListCategoriesSectionProps {
  householdId: string;
  categories: string[];
  onCategoriesChange: (categories: string[]) => void;
}

interface SortableItemProps {
  id: string;
  category: string;
  onRemove: () => void;
}

const SortableItem = ({ id, category, onRemove }: SortableItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-3 bg-background border border-border rounded-lg ${
        isDragging ? "opacity-50 shadow-lg" : ""
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none p-1"
        aria-label="Dra for å endre rekkefølge"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <span className="flex-1 text-foreground">{category}</span>
      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="h-8 w-8 text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};

export const ShoppingListCategoriesSection = ({
  householdId,
  categories,
  onCategoriesChange,
}: ShoppingListCategoriesSectionProps) => {
  const [localCategories, setLocalCategories] = useState<string[]>(categories);
  const [newCategory, setNewCategory] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  const saveCategories = async (newCategories: string[]) => {
    try {
      const { error } = await supabase
        .from("households")
        .update({ shopping_list_categories: newCategories })
        .eq("id", householdId);

      if (error) throw error;
      onCategoriesChange(newCategories);
    } catch (error: any) {
      toast.error(error.message || "Kunne ikke lagre kategorier");
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = localCategories.indexOf(active.id as string);
      const newIndex = localCategories.indexOf(over.id as string);
      const newOrder = arrayMove(localCategories, oldIndex, newIndex);
      setLocalCategories(newOrder);
      saveCategories(newOrder);
    }
  };

  const handleAddCategory = () => {
    const trimmed = newCategory.trim();
    if (!trimmed) {
      toast.error("Vennligst skriv inn et kategorinavn");
      return;
    }
    if (localCategories.includes(trimmed)) {
      toast.error("Denne kategorien finnes allerede");
      return;
    }
    const newCategories = [...localCategories, trimmed];
    setLocalCategories(newCategories);
    setNewCategory("");
    saveCategories(newCategories);
  };

  const handleRemoveCategory = (index: number) => {
    const newCategories = localCategories.filter((_, i) => i !== index);
    setLocalCategories(newCategories);
    saveCategories(newCategories);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <ListOrdered className="h-5 w-5" />
          Handlelistekategorier
        </CardTitle>
        <CardDescription>
          Tilpass kategoriene som brukes når handlelister genereres
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {localCategories.length === 0 ? (
          <p className="text-sm text-muted-foreground italic py-4 text-center">
            Ingen kategorier lagt til ennå
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={localCategories}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {localCategories.map((category, index) => (
                  <SortableItem
                    key={category}
                    id={category}
                    category={category}
                    onRemove={() => handleRemoveCategory(index)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        <div className="space-y-2 pt-2">
          <Label htmlFor="newCategory">Legg til kategori</Label>
          <div className="flex gap-2">
            <Input
              id="newCategory"
              placeholder="Ny kategori..."
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddCategory();
                }
              }}
            />
            <Button variant="outline" size="icon" onClick={handleAddCategory}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
