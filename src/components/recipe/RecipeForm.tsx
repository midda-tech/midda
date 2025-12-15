import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DynamicTextFields } from "@/components/recipe/DynamicTextFields";
import { IconSelector } from "@/components/recipe/IconSelector";
import { TagSelector } from "@/components/recipe/TagSelector";
import { useRecipeTags } from "@/hooks/useRecipeTags";
import { getRecipeIcon, DEFAULT_ICON } from "@/lib/recipeIcons";

export interface RecipeFormData {
  title: string;
  servings: number;
  icon: number;
  ingredients: string[];
  instructions: string[];
  tags: string[];
}

interface RecipeFormProps {
  initialData?: RecipeFormData;
  householdId: string;
  isSystemRecipe?: boolean;
  onSubmit: (data: RecipeFormData) => void;
  onCancel: () => void;
  submitLabel: string;
  isSubmitting: boolean;
}

const defaultFormData: RecipeFormData = {
  title: "",
  servings: 2,
  icon: DEFAULT_ICON,
  ingredients: [""],
  instructions: [""],
  tags: []
};

export const RecipeForm = ({
  initialData,
  householdId,
  isSystemRecipe = false,
  onSubmit,
  onCancel,
  submitLabel,
  isSubmitting
}: RecipeFormProps) => {
  const [formData, setFormData] = useState<RecipeFormData>(initialData || defaultFormData);
  const [servingsInput, setServingsInput] = useState(String(initialData?.servings ?? defaultFormData.servings));
  const { tags: availableTags } = useRecipeTags(householdId);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      setServingsInput(String(initialData.servings));
    }
  }, [initialData]);

  const updateIngredients = {
    add: () => setFormData(prev => ({ ...prev, ingredients: [...prev.ingredients, ""] })),
    remove: (index: number) => {
      if (formData.ingredients.length > 1) {
        setFormData(prev => ({
          ...prev,
          ingredients: prev.ingredients.filter((_, i) => i !== index)
        }));
      }
    },
    update: (index: number, value: string) => {
      setFormData(prev => {
        const updated = [...prev.ingredients];
        updated[index] = value;
        return { ...prev, ingredients: updated };
      });
    },
  };

  const updateInstructions = {
    add: () => setFormData(prev => ({ ...prev, instructions: [...prev.instructions, ""] })),
    remove: (index: number) => {
      if (formData.instructions.length > 1) {
        setFormData(prev => ({
          ...prev,
          instructions: prev.instructions.filter((_, i) => i !== index)
        }));
      }
    },
    update: (index: number, value: string) => {
      setFormData(prev => {
        const updated = [...prev.instructions];
        updated[index] = value;
        return { ...prev, instructions: updated };
      });
    },
  };

  const handleTagToggle = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const handleTagRemove = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tagToRemove)
    }));
  };

  const handleNewTag = (newTag: string) => {
    const trimmedTag = newTag.trim().toLowerCase();
    if (trimmedTag && !formData.tags.includes(trimmedTag)) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, trimmedTag] }));
    }
  };

  const handleSubmit = () => {
    onSubmit(formData);
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Label htmlFor="title">Tittel</Label>
        <Input
          id="title"
          placeholder="F.eks. Tomat- og paprikapasta"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          disabled={isSystemRecipe}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="servings">Antall personer</Label>
        <Input
          id="servings"
          type="number"
          min="1"
          max="50"
          value={servingsInput}
          onChange={(e) => setServingsInput(e.target.value)}
          onBlur={() => {
            const value = parseInt(servingsInput);
            const validValue = isNaN(value) || value < 1 ? 1 : value;
            setServingsInput(String(validValue));
            setFormData(prev => ({ ...prev, servings: validValue }));
          }}
          disabled={isSystemRecipe}
        />
      </div>

      <div className="space-y-2">
        <Label>Velg ikon</Label>
        {isSystemRecipe ? (
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg border-2 border-border bg-card p-2 flex-shrink-0">
              <img src={getRecipeIcon(formData.icon)} alt="" className="w-full h-full object-contain" />
            </div>
            <div className="flex-1 h-12 rounded-lg border-2 border-border bg-muted/50 px-4 flex items-center">
              <span className="text-muted-foreground">Kan ikke endres</span>
            </div>
          </div>
        ) : (
          <IconSelector
            selectedIcon={formData.icon}
            onIconSelect={(icon) => setFormData(prev => ({ ...prev, icon }))}
          />
        )}
      </div>

      <div className="space-y-2.5">
        <Label>Ingredienser *</Label>
        <DynamicTextFields
          fields={formData.ingredients}
          onUpdate={updateIngredients.update}
          onAdd={updateIngredients.add}
          onRemove={updateIngredients.remove}
          placeholder={() => "F.eks. 2 dl melk"}
          addButtonLabel="Legg til ingrediens"
          disabled={isSystemRecipe}
        />
      </div>

      <div className="space-y-2.5">
        <Label>Fremgangsmåte *</Label>
        <DynamicTextFields
          fields={formData.instructions}
          onUpdate={updateInstructions.update}
          onAdd={updateInstructions.add}
          onRemove={updateInstructions.remove}
          placeholder={(index) => `Steg ${index + 1}`}
          addButtonLabel="Legg til steg"
          disabled={isSystemRecipe}
        />
      </div>

      <div className="space-y-2.5">
        <Label>Tags</Label>
        {isSystemRecipe ? (
          <div className="flex flex-wrap gap-2">
            {formData.tags.map((tag) => (
              <div key={tag} className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm">
                {tag}
              </div>
            ))}
          </div>
        ) : (
          <TagSelector
            selectedTags={formData.tags}
            availableTags={availableTags}
            onTagToggle={handleTagToggle}
            onTagRemove={handleTagRemove}
            onNewTag={handleNewTag}
          />
        )}
      </div>

      <div className="flex gap-3 pt-4">
        {!isSystemRecipe && (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            size="lg"
            className="flex-1"
          >
            {isSubmitting ? "Lagrer..." : submitLabel}
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={onCancel}
          disabled={isSubmitting}
          className={isSystemRecipe ? "flex-1" : ""}
        >
          {isSystemRecipe ? "Tilbake" : "Avbryt"}
        </Button>
      </div>
    </div>
  );
};
