import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Check, Users } from "lucide-react";
import { toast } from "sonner";
import { Json } from "@/integrations/supabase/types";
import { getRecipeIcon } from "@/lib/recipeIcons";
import { AppHeader } from "@/components/AppHeader";
import { useRequireAuth } from "@/hooks/useRequireAuth";

interface RecipeInstruction {
  step: number;
  text: string;
}

interface SystemRecipe {
  id: string;
  title: string;
  servings: number;
  ingredients: Json;
  instructions: Json;
  tags: Json;
  icon: number | null;
}

const ViewSystemRecipe = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { loading: authLoading, householdId, userId } = useRequireAuth();
  const [recipe, setRecipe] = useState<SystemRecipe | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !householdId || !id) return;
    
    fetchData();
  }, [authLoading, householdId, id]);

  const fetchData = async () => {
    try {
      const { data: recipeData, error: recipeError } = await supabase
        .from("system_recipes")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (recipeError) throw recipeError;
      
      if (!recipeData) {
        toast.error("Oppskriften ble ikke funnet");
        navigate("/app/oppskrifter/oppdag");
        return;
      }

      setRecipe(recipeData);

      // Check if already saved
      const { data: existing } = await supabase
        .from("household_recipes")
        .select("id")
        .eq("household_id", householdId!)
        .ilike("title", recipeData.title)
        .maybeSingle();

      setIsSaved(!!existing);
    } catch (error) {
      console.error("Error fetching recipe:", error);
      toast.error("Kunne ikke laste oppskriften");
    } finally {
      setDataLoading(false);
    }
  };

  const handleSaveRecipe = async () => {
    if (!recipe || !householdId || !userId || isSaved) return;

    setIsSaving(true);
    
    try {
      const { error } = await supabase
        .from("household_recipes")
        .insert({
          household_id: householdId,
          created_by: userId,
          title: recipe.title,
          servings: recipe.servings,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          tags: recipe.tags,
          icon: recipe.icon
        });

      if (error) throw error;

      setIsSaved(true);
      toast.success(`"${recipe.title}" lagt til i dine oppskrifter`);
    } catch (error) {
      console.error("Error saving recipe:", error);
      toast.error("Kunne ikke lagre oppskriften");
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || dataLoading) {
    return null;
  }

  if (!recipe) {
    return null;
  }

  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  const rawInstructions = Array.isArray(recipe.instructions) ? recipe.instructions : [];
  const instructions = rawInstructions
    .filter((i): i is { step: number; text: string } => 
      typeof i === 'object' && i !== null && 'step' in i && 'text' in i
    )
    .sort((a, b) => a.step - b.step);
  const tags = Array.isArray(recipe.tags) ? recipe.tags : [];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      
      <main className="flex-1 p-4 sm:p-6 pb-24">
        <div className="max-w-2xl mx-auto">
          <Button
            variant="ghost"
            size="sm"
            className="mb-4 -ml-2 gap-1 text-muted-foreground"
            onClick={() => navigate("/app/oppskrifter/oppdag")}
          >
            <ArrowLeft className="h-4 w-4" />
            Tilbake
          </Button>

          <Card>
            <CardHeader className="text-center space-y-4 pb-6">
              <div className="flex justify-center">
                <img src={getRecipeIcon(recipe.icon)} alt="" className="h-20 w-20" />
              </div>
              <CardTitle className="text-2xl sm:text-3xl font-serif text-foreground">
                {recipe.title}
              </CardTitle>
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{recipe.servings} porsjoner</span>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center">
                  {tags.map((tag: string, idx: number) => (
                    <Badge key={idx} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </CardHeader>

            <CardContent className="space-y-8">
              <section>
                <h3 className="font-serif text-xl font-semibold text-foreground mb-4">
                  Ingredienser
                </h3>
                <ul className="space-y-2">
                  {ingredients.map((ingredient: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />
                      <span className="text-foreground">{ingredient}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {instructions.length > 0 && (
                <section>
                  <h3 className="font-serif text-xl font-semibold text-foreground mb-4">
                    Fremgangsmåte
                  </h3>
                  <ol className="space-y-4">
                    {instructions.map((instruction: RecipeInstruction) => (
                      <li key={instruction.step} className="flex gap-4">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                          {instruction.step}
                        </span>
                        <p className="text-foreground pt-0.5">{instruction.text}</p>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              <Button
                size="lg"
                className="w-full gap-2"
                variant={isSaved ? "secondary" : "default"}
                onClick={handleSaveRecipe}
                disabled={isSaved || isSaving}
              >
                {isSaved ? (
                  <>
                    <Check className="h-5 w-5" />
                    Lagret i dine oppskrifter
                  </>
                ) : (
                  <>
                    <Plus className="h-5 w-5" />
                    {isSaving ? "Lagrer..." : "Legg til i mine oppskrifter"}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ViewSystemRecipe;