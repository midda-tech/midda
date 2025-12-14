import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Compass } from "lucide-react";
import { toast } from "sonner";
import { Json } from "@/integrations/supabase/types";
import { getRecipeIcon } from "@/lib/recipeIcons";
import { AppHeader } from "@/components/AppHeader";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { NewRecipeDialog } from "@/components/recipe/NewRecipeDialog";

interface Recipe {
  id: string;
  title: string;
  servings: number;
  ingredients: Json;
  instructions: Json;
  tags: Json;
  icon: number | null;
}

const Recipes = () => {
  const navigate = useNavigate();
  const { loading: authLoading, householdId } = useRequireAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [dataLoading, setDataLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (authLoading || !householdId) return;
    
    fetchRecipes(householdId);
  }, [authLoading, householdId]);

  const fetchRecipes = async (hId: string) => {
    try {
      const { data: householdRecipes, error } = await supabase
        .from("household_recipes")
        .select("*")
        .eq("household_id", hId);

      if (error) throw error;

      setRecipes(householdRecipes || []);
    } catch (error) {
      console.error("Error fetching recipes:", error);
      toast.error("Kunne ikke laste oppskrifter");
    } finally {
      setDataLoading(false);
    }
  };

  const filteredRecipes = recipes.filter(recipe =>
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
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground">
                Oppskrifter
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                {filteredRecipes.length} oppskrifter
              </p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button 
                variant="outline"
                size="lg" 
                className="gap-2 flex-1 sm:flex-initial" 
                onClick={() => navigate("/app/oppskrifter/oppdag")}
              >
                <Compass className="h-4 w-4" />
                Oppdag
              </Button>
              <Button 
                size="lg" 
                className="gap-2 flex-1 sm:flex-initial" 
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Ny oppskrift
              </Button>
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
            {filteredRecipes.map((recipe) => (
                <Card 
                  key={recipe.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/app/oppskrifter/${recipe.id}`)}
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
                  <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
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
                </CardContent>
              </Card>
            ))}
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

      <NewRecipeDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
};

export default Recipes;
