import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ArrowLeft, Plus, Check } from "lucide-react";
import { toast } from "sonner";
import { Json } from "@/integrations/supabase/types";
import { getRecipeIcon } from "@/lib/recipeIcons";
import { AppHeader } from "@/components/AppHeader";
import { useRequireAuth } from "@/hooks/useRequireAuth";

interface SystemRecipe {
  id: string;
  title: string;
  servings: number;
  ingredients: Json;
  instructions: Json;
  tags: Json;
  icon: number | null;
}

const Discover = () => {
  const navigate = useNavigate();
  const { loading: authLoading, householdId, userId } = useRequireAuth();
  const [systemRecipes, setSystemRecipes] = useState<SystemRecipe[]>([]);
  const [savedRecipeIds, setSavedRecipeIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [dataLoading, setDataLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !householdId) return;
    
    fetchData(householdId);
  }, [authLoading, householdId]);

  const fetchData = async (hId: string) => {
    try {
      const [{ data: recipes, error: recipesError }, { data: householdRecipes, error: householdError }] = await Promise.all([
        supabase.from("system_recipes").select("*"),
        supabase.from("household_recipes").select("title").eq("household_id", hId)
      ]);

      if (recipesError) throw recipesError;
      if (householdError) throw householdError;

      setSystemRecipes(recipes || []);
      
      // Track which system recipes have already been saved (by title match)
      const savedTitles = new Set((householdRecipes || []).map(r => r.title.toLowerCase()));
      const alreadySaved = new Set<string>();
      (recipes || []).forEach(r => {
        if (savedTitles.has(r.title.toLowerCase())) {
          alreadySaved.add(r.id);
        }
      });
      setSavedRecipeIds(alreadySaved);
    } catch (error) {
      console.error("Error fetching recipes:", error);
      toast.error("Kunne ikke laste oppskrifter");
    } finally {
      setDataLoading(false);
    }
  };

  const handleSaveRecipe = async (recipe: SystemRecipe, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!householdId || !userId) return;
    if (savedRecipeIds.has(recipe.id)) return;

    setSavingId(recipe.id);
    
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

      setSavedRecipeIds(prev => new Set([...prev, recipe.id]));
      toast.success(`"${recipe.title}" lagt til i dine oppskrifter`);
    } catch (error) {
      console.error("Error saving recipe:", error);
      toast.error("Kunne ikke lagre oppskriften");
    } finally {
      setSavingId(null);
    }
  };

  const filteredRecipes = systemRecipes.filter(recipe =>
    recipe.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading || dataLoading) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      
      <main className="flex-1 p-4 sm:p-6 pb-24">
        <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
            <div className="flex-1">
              <Button
                variant="ghost"
                size="sm"
                className="mb-2 -ml-2 gap-1 text-muted-foreground"
                onClick={() => navigate("/app/oppskrifter")}
              >
                <ArrowLeft className="h-4 w-4" />
                Tilbake
              </Button>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground">
                Oppdag
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                Utforsk oppskrifter og legg til favorittene dine
              </p>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Søk etter oppskrifter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredRecipes.map((recipe) => {
              const isSaved = savedRecipeIds.has(recipe.id);
              const isSaving = savingId === recipe.id;
              
              return (
              <Card 
                  key={recipe.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer relative"
                  onClick={() => navigate(`/app/oppskrifter/oppdag/${recipe.id}`)}
                >
                  <CardHeader className="text-center space-y-4 pb-4">
                    <div className="flex justify-center">
                      <img src={getRecipeIcon(recipe.icon)} alt="" className="h-16 w-16" />
                    </div>
                    <CardTitle className="text-xl font-serif text-foreground">
                      {recipe.title}
                    </CardTitle>
                    {recipe.tags && Array.isArray(recipe.tags) && recipe.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 justify-center">
                        {recipe.tags.slice(0, 3).map((tag: string, idx: number) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground mb-4">
                      <span>{recipe.servings} personer</span>
                      <span>•</span>
                      <span>
                        {Array.isArray(recipe.ingredients) ? recipe.ingredients.length : 0} ingredienser
                      </span>
                      <span>•</span>
                      <span>
                        {Array.isArray(recipe.instructions) ? recipe.instructions.length : 0} steg
                      </span>
                    </div>
                    <Button
                      variant={isSaved ? "secondary" : "default"}
                      size="sm"
                      className="w-full gap-2"
                      onClick={(e) => handleSaveRecipe(recipe, e)}
                      disabled={isSaved || isSaving}
                    >
                      {isSaved ? (
                        <>
                          <Check className="h-4 w-4" />
                          Lagret
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          {isSaving ? "Lagrer..." : "Legg til"}
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredRecipes.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Ingen oppskrifter funnet
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Discover;