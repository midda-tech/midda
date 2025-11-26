import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { DynamicTextFields } from "@/components/recipe/DynamicTextFields";
import { IconSelector } from "@/components/recipe/IconSelector";
import { TagSelector } from "@/components/recipe/TagSelector";
import { useRecipeTags } from "@/hooks/useRecipeTags";
import { z } from "zod";

const recipeSchema = z.object({
  title: z.string().trim().min(1, "Tittel er påkrevd").max(100, "Tittel må være mindre enn 100 tegn"),
  servings: z.number().min(1, "Antall personer må være minst 1").max(50, "Antall personer må være mindre enn 50"),
  icon: z.number().min(1).max(10),
  ingredients: z.array(z.string().trim().min(1, "Ingrediens kan ikke være tom")).min(1, "Minst én ingrediens er påkrevd"),
  instructions: z.array(z.string().trim().min(1, "Steg kan ikke være tomt")).min(1, "Minst ett steg er påkrevd"),
  tags: z.array(z.string().trim().min(1))
});

const NewRecipe = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [servings, setServings] = useState(2);
  const [selectedIcon, setSelectedIcon] = useState(1);
  const [ingredients, setIngredients] = useState<string[]>([""]);
  const [instructions, setInstructions] = useState<string[]>([""]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const { tags: availableTags, addTag } = useRecipeTags(householdId);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setUserId(session.user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("current_household_id")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!profile?.current_household_id) {
        navigate("/velg-husstand");
        return;
      }

      setHouseholdId(profile.current_household_id);
      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

  const updateIngredients = {
    add: () => setIngredients([...ingredients, ""]),
    remove: (index: number) => ingredients.length > 1 && setIngredients(ingredients.filter((_, i) => i !== index)),
    update: (index: number, value: string) => {
      const updated = [...ingredients];
      updated[index] = value;
      setIngredients(updated);
    },
  };

  const updateInstructions = {
    add: () => setInstructions([...instructions, ""]),
    remove: (index: number) => instructions.length > 1 && setInstructions(instructions.filter((_, i) => i !== index)),
    update: (index: number, value: string) => {
      const updated = [...instructions];
      updated[index] = value;
      setInstructions(updated);
    },
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags((current) =>
      current.includes(tag)
        ? current.filter((t) => t !== tag)
        : [...current, tag]
    );
  };

  const handleTagRemove = (tagToRemove: string) => {
    setSelectedTags((current) => current.filter((t) => t !== tagToRemove));
  };

  const handleNewTag = (newTag: string) => {
    const trimmedTag = newTag.trim();
    if (trimmedTag && !selectedTags.includes(trimmedTag)) {
      setSelectedTags((current) => [...current, trimmedTag]);
      addTag(trimmedTag);
    }
  };

  const handleSave = async () => {
    if (!householdId || !userId) return;

    try {
      const filteredIngredients = ingredients.filter(i => i.trim());
      const filteredInstructions = instructions.filter(i => i.trim());

      const validated = recipeSchema.parse({
        title,
        servings,
        icon: selectedIcon,
        ingredients: filteredIngredients,
        instructions: filteredInstructions,
        tags: selectedTags
      });

      setSaving(true);

      // Transform instructions to the expected database format
      const instructionsForDb = validated.instructions.map((instruction, index) => ({
        step: index + 1,
        instruction: instruction
      }));

      const { error } = await supabase
        .from("household_recipes")
        .insert({
          household_id: householdId,
          created_by: userId,
          title: validated.title,
          servings: validated.servings,
          icon: validated.icon,
          ingredients: validated.ingredients,
          instructions: instructionsForDb,
          tags: validated.tags
        });

      if (error) throw error;

      toast.success("Oppskrift lagret!");
      navigate("/oppskrifter");
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        toast.error(firstError.message);
      } else {
        console.error("Error saving recipe:", error);
        toast.error("Kunne ikke lagre oppskrift");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      
      <main className="flex-1 p-4 sm:p-6 pb-24">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardContent className="p-6 sm:p-8 space-y-8">
              <h2 className="font-serif text-3xl font-bold text-foreground">
                Legg til ny oppskrift
              </h2>

              <div className="space-y-2">
                <Label htmlFor="title">Tittel</Label>
                <Input
                  id="title"
                  placeholder="F.eks. Tomat- og paprikapasta"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="servings">Antall personer</Label>
                <Input
                  id="servings"
                  type="number"
                  min="1"
                  max="50"
                  value={servings}
                  onChange={(e) => setServings(parseInt(e.target.value) || 1)}
                />
              </div>

              <div className="space-y-2">
                <Label>Velg ikon</Label>
                <IconSelector
                  selectedIcon={selectedIcon}
                  onIconSelect={setSelectedIcon}
                />
              </div>

              <div className="space-y-2.5">
                <Label>Ingredienser *</Label>
                <DynamicTextFields
                  fields={ingredients}
                  onUpdate={updateIngredients.update}
                  onAdd={updateIngredients.add}
                  onRemove={updateIngredients.remove}
                  placeholder={() => "F.eks. 2 dl melk"}
                  addButtonLabel="Legg til ingrediens"
                />
              </div>

              <div className="space-y-2.5">
                <Label>Fremgangsmåte *</Label>
                <DynamicTextFields
                  fields={instructions}
                  onUpdate={updateInstructions.update}
                  onAdd={updateInstructions.add}
                  onRemove={updateInstructions.remove}
                  placeholder={(index) => `Steg ${index + 1}`}
                  addButtonLabel="Legg til steg"
                />
              </div>

              <div className="space-y-2.5">
                <Label>Tags</Label>
                <TagSelector
                  selectedTags={selectedTags}
                  availableTags={availableTags}
                  onTagToggle={handleTagToggle}
                  onTagRemove={handleTagRemove}
                  onNewTag={handleNewTag}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  size="lg"
                  className="flex-1"
                >
                  {saving ? "Lagrer..." : "Lagre oppskrift"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => navigate("/oppskrifter")}
                  disabled={saving}
                >
                  Avbryt
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default NewRecipe;
