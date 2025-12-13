import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import bookIcon from "@/assets/book-icon.png";
import cartIcon from "@/assets/shopping-cart-icon.png";

const Home = () => {
  const navigate = useNavigate();
  const { loading: authLoading, householdId } = useRequireAuth();
  const [recipeCount, setRecipeCount] = useState(0);
  const [shoppingListCount, setShoppingListCount] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !householdId) return;

    const fetchCounts = async () => {
      const [householdRecipesResult, listCountResult] = await Promise.all([
        supabase.from("household_recipes").select("id", { count: "exact", head: true }).eq("household_id", householdId),
        supabase.from("shopping_lists").select("id", { count: "exact", head: true }).eq("household_id", householdId)
      ]);
      
      setRecipeCount(householdRecipesResult.count || 0);
      setShoppingListCount(listCountResult.count || 0);
      setDataLoading(false);
    };

    fetchCounts();
  }, [authLoading, householdId]);

  if (authLoading || dataLoading) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      
      <main className="flex-1 p-4 sm:p-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid gap-6 sm:grid-cols-2">
            <Card className="flex flex-col">
              <CardHeader className="flex-1 text-center space-y-6 pb-6">
                <div className="flex justify-center pt-4">
                  <img src={bookIcon} alt="" className="h-20 w-20" />
                </div>
                <div className="space-y-3">
                  <CardTitle className="text-3xl font-serif text-foreground">
                    Oppskrifter
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Utforsk og administrer dine oppskrifter
                  </CardDescription>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <span>{recipeCount} oppskrifter</span>
                </div>
              </CardHeader>
              <CardContent className="pt-0 pb-6">
              <Button className="w-full" size="lg" onClick={() => navigate("/app/oppskrifter")}>
                Se oppskrifter
              </Button>
              </CardContent>
            </Card>

            <Card className="flex flex-col">
              <CardHeader className="flex-1 text-center space-y-6 pb-6">
                <div className="flex justify-center pt-4">
                  <img src={cartIcon} alt="" className="h-20 w-20" />
                </div>
                <div className="space-y-3">
                  <CardTitle className="text-3xl font-serif text-foreground">
                    Handlelister
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Opprett og administrer handlelister fra oppskrifter
                  </CardDescription>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <ShoppingCart className="h-3.5 w-3.5" />
                  <span>{shoppingListCount} lister</span>
                </div>
              </CardHeader>
              <CardContent className="pt-0 pb-6">
              <Button 
                  className="w-full" 
                  size="lg" 
                  onClick={() => navigate("/app/handlelister")}
                >
                  <ShoppingCart className="h-4 w-4" />
                  Se handlelister
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;
