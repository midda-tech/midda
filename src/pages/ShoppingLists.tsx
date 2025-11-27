import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import cartIcon from "@/assets/shopping-cart-icon.png";
import { ShoppingList } from "@/types/shopping-list";

const ShoppingLists = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [showGeneratingPlaceholder, setShowGeneratingPlaceholder] = useState(false);
  const [generatingTitle, setGeneratingTitle] = useState("");
  const [generatingStartTime, setGeneratingStartTime] = useState<number | null>(null);

  useEffect(() => {
    const checkAuthAndFetchLists = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
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
      await fetchShoppingLists(profile.current_household_id);
      setLoading(false);

      // Check if we're coming from the new shopping list page
      if (location.state?.generating) {
        setShowGeneratingPlaceholder(true);
        setGeneratingTitle(location.state?.title || "Handleliste");
        setGeneratingStartTime(Date.now());
        
        // Clear the navigation state
        window.history.replaceState({}, document.title);
      }
    };

    checkAuthAndFetchLists();
  }, [navigate, location]);

  useEffect(() => {
    if (!householdId) return;

    const handleChange = async () => {
      if (showGeneratingPlaceholder && generatingStartTime) {
        const elapsed = Date.now() - generatingStartTime;
        const delay = Math.max(0, 2000 - elapsed);
        if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay));
        setShowGeneratingPlaceholder(false);
      }
      fetchShoppingLists(householdId);
    };

    const channel = supabase
      .channel('shopping-lists-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'shopping_lists',
        filter: `household_id=eq.${householdId}`
      }, handleChange)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId, showGeneratingPlaceholder, generatingStartTime]);

  const fetchShoppingLists = async (householdId: string) => {
    try {
      const { data, error } = await supabase
        .from("shopping_lists")
        .select("*")
        .eq("household_id", householdId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setShoppingLists((data || []) as unknown as ShoppingList[]);
    } catch (error) {
      console.error("Error fetching shopping lists:", error);
      toast.error("Kunne ikke laste handlelister");
    }
  };

  const isGenerating = (list: ShoppingList) => !list.shopping_list;

  if (loading) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      
      <main className="flex-1 p-4 sm:p-6 pb-24">
        <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground">
              Handlelister
            </h2>
            <Button 
              size="lg" 
              className="gap-2 w-full sm:w-auto shrink-0" 
              onClick={() => navigate("/handlelister/ny")}
            >
              <Plus className="h-4 w-4" />
              Ny handleliste
            </Button>
          </div>

          {shoppingLists.length === 0 && !showGeneratingPlaceholder ? (
            <Card className="border-2">
              <CardContent className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="mb-6">
                  <img src={cartIcon} alt="" className="h-24 w-24 opacity-50" />
                </div>
                <h3 className="font-serif text-2xl font-bold text-foreground mb-2">
                  Ingen handlelister ennå
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                  Lag din første handleliste ved å velge oppskrifter
                </p>
                <Button size="lg" onClick={() => navigate("/handlelister/ny")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Lag handleliste
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {showGeneratingPlaceholder && (
                <Card className="bg-gradient-to-br from-primary/5 via-background to-primary/10 border-primary/20 animate-pulse">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                      <span className="text-sm font-medium text-primary">Genererer...</span>
                    </div>
                    <h3 className="font-serif text-xl font-bold">{generatingTitle}</h3>
                    <p className="text-sm text-muted-foreground">AI lager handlelisten din</p>
                  </CardContent>
                </Card>
              )}
              {shoppingLists.map((list) => (
                <Card 
                  key={list.id} 
                  className="hover:shadow-md transition-all cursor-pointer"
                  onClick={() => navigate(`/handlelister/${list.id}`)}
                >
                  <CardContent className="p-6 space-y-4">
                    <h3 className="font-serif text-xl font-bold">{list.title}</h3>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{format(new Date(list.created_at), "d. MMMM yyyy", { locale: nb })}</span>
                      <span>{list.shopping_list?.categories.length || 0} kategorier</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ShoppingLists;
