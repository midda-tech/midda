import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { ShoppingList } from "@/types/shopping-list";

const ViewShoppingList = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [shoppingList, setShoppingList] = useState<ShoppingList | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    const checkAuthAndFetchList = async () => {
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

      await fetchShoppingList();
      setLoading(false);
    };

    checkAuthAndFetchList();
  }, [navigate, id]);

  const fetchShoppingList = async () => {
    try {
      const { data, error } = await supabase
        .from("shopping_lists")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        toast.error("Handleliste ikke funnet");
        navigate("/handlelister");
        return;
      }

      setShoppingList(data as unknown as ShoppingList);
    } catch (error) {
      console.error("Error fetching shopping list:", error);
      toast.error("Kunne ikke laste handleliste");
      navigate("/handlelister");
    }
  };

  const toggleItem = (item: string) => {
    setCheckedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(item)) {
        newSet.delete(item);
      } else {
        newSet.add(item);
      }
      return newSet;
    });
  };

  const categories = shoppingList?.shopping_list?.categories || [];

  if (loading) {
    return null;
  }

  if (!shoppingList) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center px-4 gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/handlelister")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-xl font-bold truncate">{shoppingList.title}</h1>
            <p className="text-xs text-muted-foreground">
              {format(new Date(shoppingList.created_at), "d. MMMM yyyy", { locale: nb })}
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 pb-24">
        <div className="max-w-2xl mx-auto space-y-4">
          {categories.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  Ingen varer i handlelisten
                </p>
              </CardContent>
            </Card>
          ) : (
            categories.map((category, idx) => (
              <Card key={idx}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-serif text-primary">
                    {category.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {category.items.map((item, itemIdx) => (
                    <div key={itemIdx} className="flex items-center gap-3">
                      <Checkbox
                        id={`${idx}-${itemIdx}`}
                        checked={checkedItems.has(item)}
                        onCheckedChange={() => toggleItem(item)}
                      />
                      <label
                        htmlFor={`${idx}-${itemIdx}`}
                        className={`flex-1 text-sm cursor-pointer ${
                          checkedItems.has(item)
                            ? 'line-through text-muted-foreground'
                            : 'text-foreground'
                        }`}
                      >
                        {item}
                      </label>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default ViewShoppingList;
