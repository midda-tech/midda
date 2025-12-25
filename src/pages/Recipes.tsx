import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Compass, SlidersHorizontal, X } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { toast } from "sonner";
import { Json } from "@/integrations/supabase/types";
import { getRecipeIcon } from "@/lib/recipeIcons";
import { AppHeader } from "@/components/AppHeader";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { NewRecipeDialog } from "@/components/recipe/NewRecipeDialog";
import { useRecipeViewPreference } from "@/hooks/useRecipeViewPreference";
import { ViewToggle } from "@/components/recipe/ViewToggle";
import { RecipeListItem } from "@/components/recipe/RecipeListItem";
import { useTagFilter } from "@/hooks/useTagFilter";

const SCROLL_KEY = "recipes-scroll-position";

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
  const { viewMode, setViewMode } = useRecipeViewPreference();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [dataLoading, setDataLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const { selectedTags, allTags, toggleTag, clearFilters, filterByTags } = useTagFilter(recipes);

  // Save scroll position before navigating away
  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Restore scroll position after data loads
  useEffect(() => {
    if (!dataLoading && recipes.length > 0) {
      const savedPosition = sessionStorage.getItem(SCROLL_KEY);
      if (savedPosition) {
        window.scrollTo(0, parseInt(savedPosition, 10));
      }
    }
  }, [dataLoading, recipes.length]);

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

  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = recipe.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch && filterByTags(recipe);
  });

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

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Søk etter oppskrifter..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
            <Drawer open={filterOpen} onOpenChange={setFilterOpen}>
              <DrawerTrigger asChild>
                <Button variant="outline" size="icon" className="relative shrink-0">
                  <SlidersHorizontal className="h-4 w-4" />
                  {selectedTags.length > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
                      {selectedTags.length}
                    </span>
                  )}
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader className="flex flex-row items-center justify-between">
                  <DrawerTitle>Filtrer etter tagger</DrawerTitle>
                  {selectedTags.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <X className="h-4 w-4 mr-1" />
                      Nullstill
                    </Button>
                  )}
                </DrawerHeader>
                <div className="px-4 pb-6">
                  {allTags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {allTags.map((tag) => (
                        <Badge
                          key={tag}
                          variant={selectedTags.includes(tag) ? "default" : "outline"}
                          className="cursor-pointer text-sm px-3 py-1"
                          onClick={() => toggleTag(tag)}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      Ingen tagger funnet
                    </p>
                  )}
                </div>
              </DrawerContent>
            </Drawer>
          </div>

          <div className="flex flex-col gap-3">
            {viewMode === "card" ? (
              filteredRecipes.map((recipe) => (
                <Card 
                  key={recipe.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/app/oppskrifter/${recipe.id}`)}
                >
                  <CardContent className="p-4 flex flex-col items-center text-center">
                    <img src={getRecipeIcon(recipe.icon)} alt="" className="h-12 w-12 mb-2" />
                    <span className="font-serif text-lg font-bold text-foreground">
                      {recipe.title}
                    </span>
                    {recipe.tags && Array.isArray(recipe.tags) && recipe.tags.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-1 mt-2">
                        {recipe.tags.slice(0, 3).map((tag: string, idx: number) => (
                          <Badge key={idx} variant="secondary" className="text-xs px-1.5 py-0">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              filteredRecipes.map((recipe) => (
                <RecipeListItem
                  key={recipe.id}
                  title={recipe.title}
                  icon={recipe.icon}
                  tags={Array.isArray(recipe.tags) ? (recipe.tags as string[]) : []}
                  onClick={() => navigate(`/app/oppskrifter/${recipe.id}`)}
                />
              ))
            )}
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
