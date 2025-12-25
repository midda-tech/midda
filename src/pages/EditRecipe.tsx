import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { RecipeForm, RecipeFormData } from "@/components/recipe/RecipeForm";
import { DEFAULT_ICON } from "@/lib/recipeIcons";
import { Trash2 } from "lucide-react";
import { z } from "zod";
import { registerRecipeTags } from "@/hooks/useRegisterRecipeTags";

const recipeSchema = z.object({
  title: z.string().trim().min(1, "Tittel er påkrevd").max(100, "Tittel må være mindre enn 100 tegn"),
  servings: z.number().min(1, "Antall personer må være minst 1").max(50, "Antall personer må være mindre enn 50"),
  icon: z.number().min(1).max(10),
  ingredients: z.array(z.string().trim().min(1, "Ingrediens kan ikke være tom")).min(1, "Minst én ingrediens er påkrevd"),
  instructions: z.array(z.string().trim().min(1, "Steg kan ikke være tomt")).min(1, "Minst ett steg er påkrevd"),
  tags: z.array(z.string().trim().min(1)),
  description: z.string().max(500, "Beskrivelse må være mindre enn 500 tegn").optional(),
  sourceUrl: z.string().url("Ugyldig URL").optional().or(z.literal(""))
});

const EditRecipe = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isSystemRecipe, setIsSystemRecipe] = useState(false);
  const [initialData, setInitialData] = useState<RecipeFormData | null>(null);

  useEffect(() => {
    const loadRecipe = async () => {
      if (!id) {
        navigate("/app/oppskrifter");
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/logg-inn");
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

      const { data: householdRecipe } = await supabase
        .from("household_recipes")
        .select("*")
        .eq("id", id)
        .eq("household_id", profile.current_household_id)
        .maybeSingle();

      if (householdRecipe) {
        setIsSystemRecipe(false);
        setInitialData(transformRecipeToFormData(householdRecipe));
        setLoading(false);
        return;
      }

      const { data: systemRecipe } = await supabase
        .from("system_recipes")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (systemRecipe) {
        setIsSystemRecipe(true);
        setInitialData(transformRecipeToFormData(systemRecipe));
        setLoading(false);
        return;
      }

      toast.error("Oppskrift ikke funnet");
      navigate("/app/oppskrifter");
    };

    loadRecipe();
  }, [id, navigate]);

  const transformRecipeToFormData = (recipe: any): RecipeFormData => {
    const ingredients = Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0
      ? recipe.ingredients
      : [""];

    const instructions = Array.isArray(recipe.instructions)
      ? recipe.instructions
          .sort((a: any, b: any) => (a.step || 0) - (b.step || 0))
          .map((inst: any) => inst.instruction || "")
      : [""];

    const tags = Array.isArray(recipe.tags) ? recipe.tags : [];

    return {
      title: recipe.title,
      servings: recipe.servings,
      icon: recipe.icon ?? DEFAULT_ICON,
      ingredients: ingredients.length > 0 ? ingredients : [""],
      instructions: instructions.length > 0 ? instructions : [""],
      tags,
      description: recipe.description || "",
      sourceUrl: recipe.source_url || ""
    };
  };

  const handleSubmit = async (formData: RecipeFormData) => {
    if (!householdId || !userId || !id || isSystemRecipe) return;

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
        .update({
          title: validated.title,
          servings: validated.servings,
          icon: validated.icon,
          ingredients: validated.ingredients,
          instructions: instructionsForDb,
          tags: validated.tags,
          description: validated.description || null,
          source_url: validated.sourceUrl || null
        })
        .eq("id", id)
        .eq("household_id", householdId);

      if (error) throw error;

      toast.success("Oppskrift oppdatert!");
      navigate(`/app/oppskrifter/${id}`);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        toast.error(firstError.message);
      } else {
        console.error("Error updating recipe:", error);
        toast.error("Kunne ikke oppdatere oppskrift");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!householdId || !id || isSystemRecipe) return;

    try {
      setDeleting(true);

      const { error } = await supabase
        .from("household_recipes")
        .delete()
        .eq("id", id)
        .eq("household_id", householdId);

      if (error) throw error;

      toast.success("Oppskrift slettet!");
      navigate("/app/oppskrifter");
    } catch (error) {
      console.error("Error deleting recipe:", error);
      toast.error("Kunne ikke slette oppskrift");
      setDeleting(false);
    }
  };

  if (loading || !householdId || !initialData) {
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
                {isSystemRecipe ? "Vis oppskrift" : "Rediger oppskrift"}
              </h2>

              {isSystemRecipe && (
                <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                  Dette er en systemoppskrift og kan ikke redigeres.
                </div>
              )}

              <RecipeForm
                initialData={initialData}
                householdId={householdId}
                isSystemRecipe={isSystemRecipe}
                onSubmit={handleSubmit}
                onCancel={() => navigate(`/app/oppskrifter/${id}`)}
                submitLabel="Lagre endringer"
                isSubmitting={saving}
              />

              {!isSystemRecipe && (
                <div className="pt-4">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="lg" 
                        disabled={deleting}
                        className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Slett oppskrift
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Slett oppskrift?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Er du sikker på at du vil slette denne oppskriften? Dette kan ikke angres.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Avbryt</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Slett
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default EditRecipe;
