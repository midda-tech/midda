import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, Minus, Plus, Check } from "lucide-react";
import { toast } from "sonner";
import { Json } from "@/integrations/supabase/types";
import { getRecipeIcon } from "@/lib/recipeIcons";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Recipe {
  id: string;
  title: string;
  servings: number;
  ingredients: Json;
  tags: Json;
  icon: number | null;
}

interface SelectedRecipe {
  id: string;
  title: string;
  servings: number;
}

const NewShoppingList = () => {
  const navigate = useNavigate();
  const { loading: authLoading, householdId } = useRequireAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [listTitle, setListTitle] = useState("");
  const [selectedRecipes, setSelectedRecipes] = useState<SelectedRecipe[]>([]);
  const [showTitleDialog, setShowTitleDialog] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  const todayFormatted = format(new Date(), "EEEE d. MMMM", { locale: nb });
  const capitalizedDate = todayFormatted.charAt(0).toUpperCase() + todayFormatted.slice(1);

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

  const isRecipeSelected = (recipeId: string) => {
    return selectedRecipes.some(r => r.id === recipeId);
  };

  const getSelectedRecipeServings = (recipeId: string) => {
    return selectedRecipes.find(r => r.id === recipeId)?.servings;
  };

  const toggleRecipe = (recipe: Recipe) => {
    if (isRecipeSelected(recipe.id)) {
      setSelectedRecipes(prev => prev.filter(r => r.id !== recipe.id));
    } else {
      setSelectedRecipes(prev => [...prev, {
        id: recipe.id,
        title: recipe.title,
        servings: recipe.servings
      }]);
    }
  };

  const updateServings = (recipeId: string, delta: number) => {
    setSelectedRecipes(prev => prev.map(r => {
      if (r.id === recipeId) {
        const newServings = Math.max(1, r.servings + delta);
        return { ...r, servings: newServings };
      }
      return r;
    }));
  };

  const handleGenerateClick = () => {
    if (selectedRecipes.length === 0) {
      toast.error("Vennligst velg minst én oppskrift");
      return;
    }
    setShowTitleDialog(true);
  };

  const handleGenerate = async () => {
    if (!listTitle.trim()) {
      toast.error("Vennligst gi handlelisten en tittel");
      return;
    }

    setShowTitleDialog(false);

    try {
      // Start the generation process (don't await)
      supabase.functions.invoke("generate-shopping-list", {
        body: {
          recipe_selections: selectedRecipes.map(r => ({
            id: r.id,
            table: "household_recipes",
            servings: r.servings
          })),
          shoppingListTitle: listTitle.trim()
        }
      }).then(({ error }) => {
        if (error) {
          console.error("Error generating shopping list:", error);
          toast.error("Kunne ikke generere handleliste");
        }
      });

      // Navigate immediately with generating state
      toast.success("Handleliste genereres!");
      navigate("/app/handlelister", { state: { generating: true, title: listTitle.trim() } });
    } catch (error) {
      console.error("Error generating shopping list:", error);
      toast.error("Kunne ikke generere handleliste");
    }
  };

  if (authLoading || dataLoading) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center px-4 gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/app/handlelister")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-serif text-xl font-bold">Ny handleliste</h1>
        </div>
      </header>

      <main className="flex-1 p-4 pb-32">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Søk etter oppskrifter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="space-y-3">
            {filteredRecipes.map((recipe) => {
              const selected = isRecipeSelected(recipe.id);
              const servings = getSelectedRecipeServings(recipe.id);

              return (
                <Card 
                  key={recipe.id}
                  className={`transition-all cursor-pointer hover:shadow-md ${
                    selected ? 'border-primary ring-2 ring-primary' : ''
                  }`}
                  onClick={() => toggleRecipe(recipe)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className={`shrink-0 rounded-lg p-3 transition-colors ${
                        selected 
                          ? 'bg-primary' 
                          : 'bg-secondary'
                      }`}>
                        {selected ? (
                          <Check className="h-6 w-6 text-primary-foreground" />
                        ) : (
                          <img src={getRecipeIcon(recipe.icon)} alt="" className="h-6 w-6" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground mb-1">
                          {recipe.title}
                        </h3>
                        {recipe.tags && Array.isArray(recipe.tags) && recipe.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {recipe.tags.slice(0, 3).map((tag: string, idx: number) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {selected && servings && (
                      <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateServings(recipe.id, -1);
                          }}
                          disabled={servings <= 1}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm font-medium flex-1 text-center">
                          {servings} personer
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateServings(recipe.id, 1);
                          }}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredRecipes.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                {recipes.length === 0 
                  ? "Du har ingen oppskrifter ennå" 
                  : "Ingen oppskrifter funnet"}
              </p>
              {recipes.length === 0 && (
                <Button 
                  variant="outline" 
                  onClick={() => navigate("/app/oppskrifter")}
                >
                  Gå til oppskrifter
                </Button>
              )}
            </div>
          )}
        </div>
      </main>

      {selectedRecipes.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 border-t-2 bg-primary shadow-lg p-6">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
            <div>
              <div className="text-primary-foreground text-lg font-bold">
                {selectedRecipes.length} {selectedRecipes.length === 1 ? 'oppskrift' : 'oppskrifter'}
              </div>
              <div className="text-primary-foreground/80 text-sm">
                Klar til å generere
              </div>
            </div>
            <Button 
              size="lg"
              variant="secondary"
              className="font-bold"
              onClick={handleGenerateClick}
            >
              Generer handleliste
            </Button>
          </div>
        </div>
      )}

      <Dialog open={showTitleDialog} onOpenChange={setShowTitleDialog}>
        <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Gi handlelisten en tittel</DialogTitle>
            <DialogDescription>
              Velg et navn som gjør det enkelt å finne igjen listen senere.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="dialog-title">Tittel</Label>
            <Input
              id="dialog-title"
              placeholder="F.eks. Ukehandel"
              value={listTitle}
              onChange={(e) => setListTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && listTitle.trim()) {
                  handleGenerate();
                }
              }}
            />
            <button
              type="button"
              onClick={() => setListTitle(capitalizedDate)}
              className="text-sm text-primary underline hover:text-primary/80 transition-colors"
            >
              {capitalizedDate}
            </button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTitleDialog(false)}>
              Avbryt
            </Button>
            <Button onClick={handleGenerate} disabled={!listTitle.trim()}>
              Generer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NewShoppingList;
