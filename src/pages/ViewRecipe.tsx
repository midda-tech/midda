import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { getRecipeIcon } from "@/lib/recipeIcons";
import { Pencil, ArrowLeft, Users, Plus, Check, ExternalLink } from "lucide-react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useAddRecipeToHousehold } from "@/hooks/useAddRecipeToHousehold";

interface RecipeInstruction {
  step: number;
  instruction: string;
}

const ViewRecipe = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { loading: authLoading, householdId, userId } = useRequireAuth();
  const { adding, addToHousehold } = useAddRecipeToHousehold(householdId, userId);
  const [loading, setLoading] = useState(true);
  const [recipe, setRecipe] = useState<any>(null);
  const [isSystemRecipe, setIsSystemRecipe] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  useEffect(() => {
    if (authLoading || !householdId) return;

    const loadRecipe = async () => {
      if (!id) {
        navigate("/app/oppskrifter");
        return;
      }

      // Try household recipes first
      const { data: householdRecipe } = await supabase
        .from("household_recipes")
        .select("*")
        .eq("id", id)
        .eq("household_id", householdId)
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
        
        // Check if already saved to household
        const { data: existing } = await supabase
          .from("household_recipes")
          .select("id")
          .eq("household_id", householdId)
          .ilike("title", systemRecipe.title)
          .maybeSingle();
        
        if (existing) {
          setIsAdded(true);
        }
        
        setLoading(false);
        return;
      }

      toast.error("Oppskrift ikke funnet");
      navigate("/app/oppskrifter");
    };

    loadRecipe();
  }, [id, navigate, authLoading, householdId]);

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
                variant={isAdded ? "secondary" : "default"}
                onClick={async () => {
                  const success = await addToHousehold(recipe);
                  if (success) {
                    setIsAdded(true);
                  }
                }}
                disabled={adding || isAdded}
                className="gap-2"
              >
                {isAdded ? (
                  <>
                    <Check className="h-4 w-4" />
                    Lagret
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    {adding ? "Legger til..." : "Legg til"}
                  </>
                )}
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
                {recipe.description && (
                  <p className="text-muted-foreground italic max-w-lg">
                    {recipe.description}
                  </p>
                )}
                {recipe.source_url && (
                  <a
                    href={recipe.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {(() => {
                      try {
                        return new URL(recipe.source_url).hostname.replace('www.', '');
                      } catch {
                        return 'Se original';
                      }
                    })()}
                  </a>
                )}
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
