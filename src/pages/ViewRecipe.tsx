import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { getRecipeIcon } from "@/lib/recipeIcons";
import { Pencil, ArrowLeft, Users, Plus } from "lucide-react";

interface RecipeInstruction {
  step: number;
  instruction: string;
}

const ViewRecipe = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [recipe, setRecipe] = useState<any>(null);
  const [isSystemRecipe, setIsSystemRecipe] = useState(false);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

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
      setUserId(session.user.id);

      // Try household recipes first
      const { data: householdRecipe } = await supabase
        .from("household_recipes")
        .select("*")
        .eq("id", id)
        .eq("household_id", profile.current_household_id)
        .maybeSingle();

      if (householdRecipe) {
        setIsSystemRecipe(false);
        setRecipe(householdRecipe);
        setLoading(false);
        return;
      }

      // Check system recipes
      const { data: systemRecipe } = await supabase
        .from("system_recipes")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (systemRecipe) {
        setIsSystemRecipe(true);
        setRecipe(systemRecipe);
        setLoading(false);
        return;
      }

      toast.error("Oppskrift ikke funnet");
      navigate("/app/oppskrifter");
    };

    loadRecipe();
  }, [id, navigate]);

  const addToHousehold = async () => {
    if (!householdId || !userId || !recipe) return;
    
    setAdding(true);
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
          icon: recipe.icon,
        });

      if (error) throw error;

      toast.success("Oppskrift lagt til i dine oppskrifter");
      navigate("/app/oppskrifter");
    } catch (error) {
      console.error("Error adding recipe:", error);
      toast.error("Kunne ikke legge til oppskrift");
    } finally {
      setAdding(false);
    }
  };

  if (loading || !recipe) {
    return null;
  }

  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  const instructions = Array.isArray(recipe.instructions) 
    ? recipe.instructions.sort((a: RecipeInstruction, b: RecipeInstruction) => a.step - b.step)
    : [];
  const tags = Array.isArray(recipe.tags) ? recipe.tags : [];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      
      <main className="flex-1 p-4 sm:p-6 pb-24">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(isSystemRecipe ? "/app/oppskrifter/oppdag" : "/app/oppskrifter")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1" />
            {isSystemRecipe ? (
              <Button
                onClick={addToHousehold}
                disabled={adding}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                {adding ? "Legger til..." : "Legg til"}
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => navigate(`/app/oppskrifter/${id}/rediger`)}
                className="gap-2"
              >
                <Pencil className="h-4 w-4" />
                Rediger
              </Button>
            )}
          </div>

          <Card>
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col items-center text-center space-y-4 pb-6 border-b">
                <img 
                  src={getRecipeIcon(recipe.icon)} 
                  alt="" 
                  className="h-16 w-16" 
                />
                <div className="space-y-2">
                  <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
                    {recipe.title}
                  </h1>
                  <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{recipe.servings} personer</span>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 justify-center">
                      {tags.map((tag: string, idx: number) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-6 sm:gap-8 pt-6">
                <div className="space-y-3">
                  <h2 className="font-serif text-xl font-bold text-foreground">
                    Ingredienser
                  </h2>
                  <ul className="space-y-2">
                    {ingredients.map((ingredient: string, idx: number) => (
                      <li 
                        key={idx}
                        className="flex items-start gap-2 leading-relaxed"
                      >
                        <span className="text-primary font-bold text-lg leading-none mt-0.5">•</span>
                        <span className="flex-1">{ingredient}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-3">
                  <h2 className="font-serif text-xl font-bold text-foreground">
                    Fremgangsmåte
                  </h2>
                  <ol className="space-y-3">
                    {instructions.map((inst: RecipeInstruction, idx: number) => (
                      <li 
                        key={idx}
                        className="flex gap-3 items-start"
                      >
                        <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground font-semibold text-sm">
                          {inst.step}
                        </span>
                        <p className="flex-1 leading-relaxed">
                          {inst.instruction}
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ViewRecipe;
