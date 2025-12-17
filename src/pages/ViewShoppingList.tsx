import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Trash2, Pencil, X, Plus, Check } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { ShoppingList, ShoppingListCategory } from "@/types/shopping-list";
import { Input } from "@/components/ui/input";

const ViewShoppingList = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [shoppingList, setShoppingList] = useState<ShoppingList | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [editingItem, setEditingItem] = useState<{ categoryIdx: number; itemIdx: number } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [addingToCategory, setAddingToCategory] = useState<number | null>(null);
  const [newItemValue, setNewItemValue] = useState("");

  useEffect(() => {
    const checkAuthAndFetchList = async () => {
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
        navigate("/app/handlelister");
        return;
      }

      const listData = data as unknown as ShoppingList;
      setShoppingList(listData);
      
      // Load checked items from database
      const savedCheckedItems = listData.shopping_list?.checked_items || [];
      setCheckedItems(new Set(savedCheckedItems));
    } catch (error) {
      console.error("Error fetching shopping list:", error);
      toast.error("Kunne ikke laste handleliste");
      navigate("/app/handlelister");
    }
  };

  const toggleItem = async (item: string) => {
    const newSet = new Set(checkedItems);
    if (newSet.has(item)) {
      newSet.delete(item);
    } else {
      newSet.add(item);
    }
    setCheckedItems(newSet);
    
    // Persist to database
    try {
      const { error } = await supabase
        .from("shopping_lists")
        .update({
          shopping_list: {
            categories: shoppingList?.shopping_list?.categories || [],
            checked_items: Array.from(newSet)
          } as any
        })
        .eq("id", id);

      if (error) throw error;
    } catch (error) {
      console.error("Error saving checked state:", error);
    }
  };

  const updateShoppingListInDB = async (updatedCategories: ShoppingListCategory[]) => {
    try {
      const { error } = await supabase
        .from("shopping_lists")
        .update({
          shopping_list: { 
            categories: updatedCategories,
            checked_items: Array.from(checkedItems)
          } as any
        })
        .eq("id", id);

      if (error) throw error;
    } catch (error) {
      console.error("Error updating shopping list:", error);
      toast.error("Kunne ikke oppdatere handleliste");
    }
  };

  const startEditing = (categoryIdx: number, itemIdx: number, currentValue: string) => {
    setEditingItem({ categoryIdx, itemIdx });
    setEditValue(currentValue);
  };

  const saveEdit = async () => {
    if (!shoppingList || !editingItem || !editValue.trim()) {
      setEditingItem(null);
      return;
    }

    const updatedCategories = [...categories];
    updatedCategories[editingItem.categoryIdx].items[editingItem.itemIdx] = editValue.trim();

    setShoppingList({
      ...shoppingList,
      shopping_list: { categories: updatedCategories }
    });

    await updateShoppingListInDB(updatedCategories);
    setEditingItem(null);
    setEditValue("");
  };

  const deleteItem = async (categoryIdx: number, itemIdx: number) => {
    if (!shoppingList) return;

    const updatedCategories = [...categories];
    const deletedItem = updatedCategories[categoryIdx].items[itemIdx];
    updatedCategories[categoryIdx].items.splice(itemIdx, 1);

    // Remove category if it's empty
    if (updatedCategories[categoryIdx].items.length === 0) {
      updatedCategories.splice(categoryIdx, 1);
    }

    // Remove from checked items if it was checked
    setCheckedItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(deletedItem);
      return newSet;
    });

    setShoppingList({
      ...shoppingList,
      shopping_list: { categories: updatedCategories }
    });

    await updateShoppingListInDB(updatedCategories);
    toast.success("Vare fjernet");
  };

  const startAddingItem = (categoryIdx: number) => {
    setAddingToCategory(categoryIdx);
    setNewItemValue("");
  };

  const addNewItem = async (categoryIdx: number) => {
    if (!shoppingList || !newItemValue.trim()) {
      setAddingToCategory(null);
      return;
    }

    const updatedCategories = [...categories];
    updatedCategories[categoryIdx].items.push(newItemValue.trim());

    setShoppingList({
      ...shoppingList,
      shopping_list: { categories: updatedCategories }
    });

    await updateShoppingListInDB(updatedCategories);
    setAddingToCategory(null);
    setNewItemValue("");
    toast.success("Vare lagt til");
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from("shopping_lists")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Handleliste slettet");
      navigate("/app/handlelister");
    } catch (error) {
      console.error("Error deleting shopping list:", error);
      toast.error("Kunne ikke slette handleliste");
    }
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
            onClick={() => navigate("/app/handlelister")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-xl font-bold truncate">{shoppingList.title}</h1>
            <p className="text-xs text-muted-foreground">
              {format(new Date(shoppingList.created_at), "d. MMMM yyyy", { locale: nb })}
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <Trash2 className="h-5 w-5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Slett handleliste?</AlertDialogTitle>
                <AlertDialogDescription>
                  Er du sikker på at du vil slette denne handlelisten? Dette kan ikke angres.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Avbryt</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Slett</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
                  {[...category.items]
                    .map((item, originalIdx) => ({ item, originalIdx }))
                    .sort((a, b) => {
                      const aChecked = checkedItems.has(a.item);
                      const bChecked = checkedItems.has(b.item);
                      if (aChecked === bChecked) return 0;
                      return aChecked ? 1 : -1;
                    })
                    .map(({ item, originalIdx }) => {
                    const isEditing = editingItem?.categoryIdx === idx && editingItem?.itemIdx === originalIdx;
                    
                    return (
                      <div key={originalIdx} className="flex items-center gap-2">
                        <Checkbox
                          id={`${idx}-${originalIdx}`}
                          checked={checkedItems.has(item)}
                          onCheckedChange={() => toggleItem(item)}
                          disabled={isEditing}
                        />
                        
                        {isEditing ? (
                          <>
                            <Input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  saveEdit();
                                } else if (e.key === 'Escape') {
                                  setEditingItem(null);
                                  setEditValue("");
                                }
                              }}
                              autoFocus
                              className="flex-1 h-9"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 text-primary hover:text-primary hover:bg-primary/10"
                              onClick={saveEdit}
                              disabled={!editValue.trim()}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0"
                              onClick={() => {
                                setEditingItem(null);
                                setEditValue("");
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <label
                              htmlFor={`${idx}-${originalIdx}`}
                              className={`flex-1 text-sm cursor-pointer ${
                                checkedItems.has(item)
                                  ? 'line-through text-muted-foreground'
                                  : 'text-foreground'
                              }`}
                            >
                              {item}
                            </label>
                            
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0"
                              onClick={() => startEditing(idx, originalIdx, item)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => deleteItem(idx, originalIdx)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    );
                  })}
                  
                  {addingToCategory === idx ? (
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Input
                        value={newItemValue}
                        onChange={(e) => setNewItemValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            addNewItem(idx);
                          } else if (e.key === 'Escape') {
                            setAddingToCategory(null);
                            setNewItemValue("");
                          }
                        }}
                        placeholder="F.eks. 500 g mel"
                        autoFocus
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => addNewItem(idx)}
                        disabled={!newItemValue.trim()}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setAddingToCategory(null);
                          setNewItemValue("");
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => startAddingItem(idx)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Legg til vare
                    </Button>
                  )}
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
