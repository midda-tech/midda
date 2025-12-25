import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DynamicTextFields } from "@/components/recipe/DynamicTextFields";
import { IconSelector } from "@/components/recipe/IconSelector";
import { TagSelector } from "@/components/recipe/TagSelector";
import { useRecipeTags } from "@/hooks/useRecipeTags";
import { getRecipeIcon, DEFAULT_ICON } from "@/lib/recipeIcons";
import { useFormDraft } from "@/hooks/useFormDraft";
import { toast } from "sonner";
import { Link } from "lucide-react";

export interface RecipeFormData {
  title: string;
  servings: number;
  icon: number;
  ingredients: string[];
  instructions: string[];
  tags: string[];
  description?: string;
  sourceUrl?: string;
}

interface RecipeFormProps {
  initialData?: RecipeFormData;
  householdId: string;
  isSystemRecipe?: boolean;
  draftKey?: string;
  defaultServings?: number;
  onSubmit: (data: RecipeFormData) => void;
  onCancel: () => void;
  submitLabel: string;
  isSubmitting: boolean;
}

const getDefaultFormData = (defaultServings?: number): RecipeFormData => ({
  title: "",
  servings: defaultServings ?? 4,
  icon: DEFAULT_ICON,
  ingredients: [""],
  instructions: [""],
  tags: [],
  description: "",
  sourceUrl: ""
});

export const RecipeForm = ({
  initialData,
  householdId,
  isSystemRecipe = false,
  draftKey,
  defaultServings,
  onSubmit,
  onCancel,
  submitLabel,
  isSubmitting
}: RecipeFormProps) => {
  const { saveDraft, loadDraft, clearDraft } = useFormDraft<RecipeFormData>(draftKey || "recipe-draft");
  const hasRestoredDraft = useRef(false);
  const servingsRef = useRef<HTMLInputElement>(null);
  const defaultFormData = getDefaultFormData(defaultServings);

  const [formData, setFormData] = useState<RecipeFormData>(() => {
    if (initialData) {
      return {
        ...initialData,
        icon: initialData.icon || DEFAULT_ICON,
      };
    }
    return defaultFormData;
  });
  const [servingsInput, setServingsInput] = useState(String(initialData?.servings ?? defaultFormData.servings));
  const [servingsError, setServingsError] = useState<string | null>(null);
  const { tags: tagObjects } = useRecipeTags(householdId);
  const availableTags = tagObjects.map(t => t.name);

  // Load draft on mount (only if no initialData)
  useEffect(() => {
    if (!initialData && !hasRestoredDraft.current && draftKey) {
      const draft = loadDraft();
      if (draft) {
        setFormData(draft);
        setServingsInput(String(draft.servings));
        hasRestoredDraft.current = true;
        toast.info("Kladd gjenopprettet");
      }
    }
  }, [initialData, loadDraft, draftKey]);

  // Update form when initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        icon: initialData.icon || DEFAULT_ICON,
      });
      setServingsInput(String(initialData.servings));
    }
  }, [initialData]);

  // Auto-save draft on form changes (only for new recipes with draftKey)
  useEffect(() => {
    if (!isSystemRecipe && !initialData && draftKey) {
      saveDraft(formData);
    }
  }, [formData, isSystemRecipe, initialData, saveDraft, draftKey]);

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
    reorder: (ingredients: string[]) => setFormData(prev => ({ ...prev, ingredients })),
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
    reorder: (instructions: string[]) => setFormData(prev => ({ ...prev, instructions })),
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
    const servingsValue = parseFloat(servingsInput.replace(",", "."));
    if (isNaN(servingsValue) || servingsValue <= 0) {
      setServingsError("Antall personer må være et gyldig tall");
      servingsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      servingsRef.current?.focus();
      return;
    }
    onSubmit({ ...formData, servings: servingsValue });
  };

  const handleCancel = () => {
    if (draftKey) {
      clearDraft();
    }
    onCancel();
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
        <Label htmlFor="description">Beskrivelse (valgfritt)</Label>
        <Textarea
          id="description"
          placeholder="Beskriv oppskriften kort..."
          value={formData.description || ""}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          maxLength={500}
          disabled={isSystemRecipe}
          rows={2}
          className="resize-none"
        />
        {(formData.description?.length || 0) > 400 && (
          <p className="text-xs text-muted-foreground text-right">
            {formData.description?.length || 0}/500
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="sourceUrl">Kilde (URL, valgfritt)</Label>
        <div className="relative">
          <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="sourceUrl"
            type="url"
            placeholder="https://..."
            value={formData.sourceUrl || ""}
            onChange={(e) => setFormData(prev => ({ ...prev, sourceUrl: e.target.value }))}
            disabled={isSystemRecipe}
            className="pl-9"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="servings">Antall personer</Label>
        <Input
          ref={servingsRef}
          id="servings"
          type="text"
          inputMode="decimal"
          value={servingsInput}
          onChange={(e) => {
            setServingsInput(e.target.value);
            setServingsError(null);
          }}
          onBlur={() => {
            const normalizedInput = servingsInput.replace(",", ".");
            const value = parseFloat(normalizedInput);
            if (isNaN(value) || value <= 0) {
              setServingsInput("");
              return;
            }
            setServingsInput(normalizedInput);
          }}
          disabled={isSystemRecipe}
          className={servingsError ? "border-destructive" : ""}
        />
        {servingsError && (
          <p className="text-sm text-destructive">{servingsError}</p>
        )}
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
          onReorder={updateIngredients.reorder}
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
          onReorder={updateInstructions.reorder}
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
          onClick={handleCancel}
          disabled={isSubmitting}
          className={isSystemRecipe ? "flex-1" : ""}
        >
          {isSystemRecipe ? "Tilbake" : "Avbryt"}
        </Button>
      </div>
    </div>
  );
};
