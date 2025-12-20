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
import ShareDialog from "@/components/shopping-list/ShareDialog";

interface ShoppingListWithToken extends ShoppingList {
  share_token: string | null;
}

const ViewShoppingList = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [shoppingList, setShoppingList] = useState<ShoppingListWithToken | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [editingItem, setEditingItem] = useState<{ categoryIdx: number; itemIdx: number } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [addingToCategory, setAddingToCategory] = useState<number | null>(null);
  const [newItemValue, setNewItemValue] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");

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

  // Real-time subscription for checked items
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`shopping-list-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'shopping_lists',
          filter: `id=eq.${id}`
        },
        (payload) => {
          const newData = payload.new as { shopping_list?: { checked_items?: string[]; categories?: ShoppingListCategory[] } };
          if (newData.shopping_list?.checked_items) {
            setCheckedItems(new Set(newData.shopping_list.checked_items));
          }
          if (newData.shopping_list?.categories) {
            setShoppingList(prev => prev ? {
              ...prev,
              shopping_list: newData.shopping_list as { categories: ShoppingListCategory[] }
            } : null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

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

      const listData = data as unknown as ShoppingListWithToken;
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
    // Optimistic update
    const newSet = new Set(checkedItems);
    if (newSet.has(item)) {
      newSet.delete(item);
    } else {
      newSet.add(item);
    }
    setCheckedItems(newSet);
    
    try {
      const { data, error } = await supabase.rpc('toggle_shopping_list_item', {
        p_list_id: id,
        p_item: item
      });

      if (error) throw error;
      
      // Sync state with server response
      if (data) {
        const shoppingListData = data as { checked_items?: string[] };
        const serverCheckedItems = shoppingListData.checked_items || [];
        setCheckedItems(new Set(serverCheckedItems));
      }
    } catch (error) {
      console.error("Error toggling item:", error);
      // Revert optimistic update on error
      setCheckedItems(checkedItems);
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

    const categoryName = categories[editingItem.categoryIdx].name;
    const oldValue = categories[editingItem.categoryIdx].items[editingItem.itemIdx];
    const newValue = editValue.trim();

    // Optimistic update
    const updatedCategories = [...categories];
    updatedCategories[editingItem.categoryIdx].items[editingItem.itemIdx] = newValue;
    setShoppingList({
      ...shoppingList,
      shopping_list: { ...shoppingList.shopping_list, categories: updatedCategories }
    });
    setEditingItem(null);
    setEditValue("");

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('edit_shopping_list_item', {
        p_list_id: id,
        p_category_name: categoryName,
        p_item_index: editingItem.itemIdx,
        p_new_value: newValue
      });

      if (error) throw error;

      // Sync with server response
      if (data && typeof data === 'object') {
        const result = data as { categories?: ShoppingListCategory[]; checked_items?: string[] };
        if (result.categories) {
          setShoppingList(prev => prev ? {
            ...prev,
            shopping_list: { categories: result.categories!, checked_items: result.checked_items }
          } : null);
        }
        if (result.checked_items) {
          setCheckedItems(new Set(result.checked_items));
        }
      }
    } catch (error) {
      console.error("Error editing item:", error);
      toast.error("Kunne ikke oppdatere vare");
      // Revert on error
      const revertedCategories = [...categories];
      revertedCategories[editingItem.categoryIdx].items[editingItem.itemIdx] = oldValue;
      setShoppingList({
        ...shoppingList,
        shopping_list: { ...shoppingList.shopping_list, categories: revertedCategories }
      });
    }
  };

  const deleteItem = async (categoryIdx: number, itemIdx: number) => {
    if (!shoppingList) return;

    const categoryName = categories[categoryIdx].name;
    const deletedItem = categories[categoryIdx].items[itemIdx];

    // Optimistic update
    const updatedCategories = [...categories];
    updatedCategories[categoryIdx].items.splice(itemIdx, 1);
    if (updatedCategories[categoryIdx].items.length === 0) {
      updatedCategories.splice(categoryIdx, 1);
    }
    const newCheckedItems = new Set(checkedItems);
    newCheckedItems.delete(deletedItem);
    setCheckedItems(newCheckedItems);
    setShoppingList({
      ...shoppingList,
      shopping_list: { ...shoppingList.shopping_list, categories: updatedCategories }
    });

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('remove_shopping_list_item', {
        p_list_id: id,
        p_category_name: categoryName,
        p_item_index: itemIdx
      });

      if (error) throw error;

      // Sync with server response
      if (data && typeof data === 'object') {
        const result = data as { categories?: ShoppingListCategory[]; checked_items?: string[] };
        if (result.categories) {
          setShoppingList(prev => prev ? {
            ...prev,
            shopping_list: { categories: result.categories!, checked_items: result.checked_items }
          } : null);
        }
        if (result.checked_items) {
          setCheckedItems(new Set(result.checked_items));
        }
      }
      toast.success("Vare fjernet");
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error("Kunne ikke fjerne vare");
      // Refetch to restore state
      await fetchShoppingList();
    }
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

    const categoryName = categories[categoryIdx].name;
    const newItem = newItemValue.trim();

    // Optimistic update
    const updatedCategories = [...categories];
    updatedCategories[categoryIdx].items.push(newItem);
    setShoppingList({
      ...shoppingList,
      shopping_list: { ...shoppingList.shopping_list, categories: updatedCategories }
    });
    setAddingToCategory(null);
    setNewItemValue("");

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('add_shopping_list_item', {
        p_list_id: id,
        p_category_name: categoryName,
        p_item: newItem
      });

      if (error) throw error;

      // Sync with server response
      if (data && typeof data === 'object') {
        const result = data as { categories?: ShoppingListCategory[] };
        if (result.categories) {
          setShoppingList(prev => prev ? {
            ...prev,
            shopping_list: { ...shoppingList.shopping_list, categories: result.categories! }
          } : null);
        }
      }
      toast.success("Vare lagt til");
    } catch (error) {
      console.error("Error adding item:", error);
      toast.error("Kunne ikke legge til vare");
      // Refetch to restore state
      await fetchShoppingList();
    }
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

  const startEditingTitle = () => {
    setEditedTitle(shoppingList?.title || "");
    setIsEditingTitle(true);
  };

  const saveTitle = async () => {
    const newTitle = editedTitle.trim() || "Handleliste";
    setIsEditingTitle(false);
    
    if (newTitle === shoppingList?.title) return;
    
    setShoppingList(prev => prev ? { ...prev, title: newTitle } : null);
    
    try {
      const { error } = await supabase
        .from("shopping_lists")
        .update({ title: newTitle })
        .eq("id", id);

      if (error) throw error;
    } catch (error) {
      console.error("Error updating title:", error);
      toast.error("Kunne ikke oppdatere tittel");
      setShoppingList(prev => prev ? { ...prev, title: shoppingList?.title || "" } : null);
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
            {isEditingTitle ? (
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    saveTitle();
                  } else if (e.key === 'Escape') {
                    setIsEditingTitle(false);
                  }
                }}
                autoFocus
                className="font-serif text-xl font-bold h-8 px-1"
              />
            ) : (
              <h1 
                className="font-serif text-xl font-bold truncate cursor-pointer hover:text-primary/80 transition-colors"
                onClick={startEditingTitle}
              >
                {shoppingList.title}
              </h1>
            )}
            <p className="text-xs text-muted-foreground">
              {format(new Date(shoppingList.created_at), "d. MMMM yyyy", { locale: nb })}
            </p>
          </div>
          <ShareDialog
            listId={id!}
            shareToken={shoppingList.share_token}
            onTokenChange={(token) => setShoppingList({ ...shoppingList, share_token: token })}
          />
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
