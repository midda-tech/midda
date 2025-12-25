import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { RecipeForm, RecipeFormData } from "@/components/recipe/RecipeForm";
import { z } from "zod";
import { DEFAULT_ICON } from "@/lib/recipeIcons";
import { useFormDraft } from "@/hooks/useFormDraft";
import { registerRecipeTags } from "@/hooks/useRegisterRecipeTags";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { recipeSchema } from "@/lib/recipeSchema";

const transformParsedRecipe = (recipe: any, sourceUrl?: string): RecipeFormData => ({
  title: recipe.title || "",
  servings: recipe.servings || 2,
  icon: DEFAULT_ICON,
  ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [""],
  instructions: Array.isArray(recipe.instructions)
    ? recipe.instructions.map((inst: any) => 
        typeof inst === "string" ? inst : inst.instruction || ""
      )
    : [""],
  tags: Array.isArray(recipe.tags)
    ? recipe.tags.map((t: string) => t.toLowerCase())
    : [],
  description: recipe.description || "",
  sourceUrl: sourceUrl || recipe.source_url || "",
});

const DRAFT_KEY = "new-recipe-draft";

const NewRecipe = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const parsedRecipe = location.state?.parsedRecipe;
  const parsedSourceUrl = location.state?.sourceUrl;
  const { clearDraft } = useFormDraft<RecipeFormData>(DRAFT_KEY);
  const { loading, householdId, userId } = useRequireAuth();
  
  const [saving, setSaving] = useState(false);
  const [defaultServings, setDefaultServings] = useState<number | undefined>(undefined);

  // Fetch default servings when householdId is available
  useState(() => {
    if (!householdId) return;
    
    supabase
      .from("households")
      .select("default_servings")
      .eq("id", householdId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.default_servings) {
          setDefaultServings(data.default_servings);
        }
      });
  });

  const handleSubmit = async (formData: RecipeFormData) => {
    if (!householdId || !userId) return;

    try {
      const filteredIngredients = formData.ingredients.filter(i => i.trim());
      const filteredInstructions = formData.instructions.filter(i => i.trim());

      const validated = recipeSchema.parse({
        title: formData.title,
        servings: formData.servings,
        icon: formData.icon,
        ingredients: filteredIngredients,
        instructions: filteredInstructions,
        tags: formData.tags,
        description: formData.description?.trim() || undefined,
        sourceUrl: formData.sourceUrl?.trim() || undefined
      });

      setSaving(true);

      // Register any new tags to the recipe_tags table
      await registerRecipeTags(householdId, userId, validated.tags);

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
          tags: validated.tags,
          description: validated.description || null,
          source_url: validated.sourceUrl || null
        });

      if (error) throw error;

      clearDraft();
      toast.success("Oppskrift lagret!");
      navigate("/app/oppskrifter");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        toast.error(firstError.message);
      } else {
        console.error("Error saving recipe:", error);
        const errorMessage = error?.message || error?.code || "Ukjent feil";
        toast.error(`Kunne ikke lagre oppskrift: ${errorMessage}`);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading || !householdId) {
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
                {parsedRecipe ? "Se over oppskrift" : "Legg til ny oppskrift"}
              </h2>

              <RecipeForm
                householdId={householdId}
                initialData={parsedRecipe ? transformParsedRecipe(parsedRecipe, parsedSourceUrl) : undefined}
                draftKey={parsedRecipe ? undefined : DRAFT_KEY}
                defaultServings={defaultServings}
                onSubmit={handleSubmit}
                onCancel={() => navigate("/app/oppskrifter")}
                submitLabel="Lagre oppskrift"
                isSubmitting={saving}
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default NewRecipe;
