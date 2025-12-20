import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, X, Plus, Check, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { ShoppingListCategory } from "@/types/shopping-list";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SharedListData {
  id: string;
  title: string;
  shopping_list: {
    categories: ShoppingListCategory[];
    checked_items?: string[];
  };
  created_at: string;
  updated_at: string;
}

const SharedShoppingList = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [shoppingList, setShoppingList] = useState<SharedListData | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [editingItem, setEditingItem] = useState<{ categoryIdx: number; itemIdx: number } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [addingToCategory, setAddingToCategory] = useState<number | null>(null);
  const [newItemValue, setNewItemValue] = useState("");

  useEffect(() => {
    if (token) {
      fetchSharedList();
    }
  }, [token]);

  // Real-time subscription for checked items
  useEffect(() => {
    if (!shoppingList?.id) return;

    const channel = supabase
      .channel(`shared-shopping-list-${shoppingList.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'shopping_lists',
          filter: `id=eq.${shoppingList.id}`
        },
        (payload) => {
          const newData = payload.new as { shopping_list?: { checked_items?: string[]; categories?: ShoppingListCategory[] } };
          if (newData.shopping_list?.checked_items) {
            setCheckedItems(new Set(newData.shopping_list.checked_items));
          }
          if (newData.shopping_list?.categories) {
            setShoppingList(prev => prev ? {
              ...prev,
              shopping_list: newData.shopping_list as { categories: ShoppingListCategory[]; checked_items?: string[] }
            } : null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shoppingList?.id]);

  const fetchSharedList = async () => {
    try {
      const { data, error } = await supabase.rpc('get_shopping_list_by_token', {
        p_token: token
      });

      if (error) throw error;
      
      if (!data || data.length === 0) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const listData = data[0] as unknown as SharedListData;
      setShoppingList(listData);
      
      const savedCheckedItems = listData.shopping_list?.checked_items || [];
      setCheckedItems(new Set(savedCheckedItems));
      setLoading(false);
    } catch (error) {
      console.error("Error fetching shared list:", error);
      setNotFound(true);
      setLoading(false);
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
      const { data, error } = await supabase.rpc('toggle_shopping_list_item_by_token', {
        p_token: token,
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

    // Capture values BEFORE clearing state to avoid stale closures
    const { categoryIdx, itemIdx } = editingItem;
    const categoryName = categories[categoryIdx].name;
    const oldValue = categories[categoryIdx].items[itemIdx];
    const newValue = editValue.trim();

    // Immutable optimistic update
    const updatedCategories = categories.map((cat, idx) =>
      idx === categoryIdx
        ? { ...cat, items: cat.items.map((item, i) => i === itemIdx ? newValue : item) }
        : cat
    );
    setShoppingList({
      ...shoppingList,
      shopping_list: { ...shoppingList.shopping_list, categories: updatedCategories }
    });
    setEditingItem(null);
    setEditValue("");

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('edit_shopping_list_item_by_token', {
        p_token: token,
        p_category_name: categoryName,
        p_item_index: itemIdx,
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
      // Revert on error with immutable update
      const revertedCategories = categories.map((cat, idx) =>
        idx === categoryIdx
          ? { ...cat, items: cat.items.map((item, i) => i === itemIdx ? oldValue : item) }
          : cat
      );
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

    // Immutable optimistic update
    const updatedCategories = categories
      .map((cat, idx) =>
        idx === categoryIdx
          ? { ...cat, items: cat.items.filter((_, i) => i !== itemIdx) }
          : cat
      )
      .filter(cat => cat.items.length > 0);
    
    const newCheckedItems = new Set(checkedItems);
    newCheckedItems.delete(deletedItem);
    setCheckedItems(newCheckedItems);
    setShoppingList({
      ...shoppingList,
      shopping_list: { ...shoppingList.shopping_list, categories: updatedCategories }
    });

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('remove_shopping_list_item_by_token', {
        p_token: token,
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
      await fetchSharedList();
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

    // Immutable optimistic update
    const updatedCategories = categories.map((cat, idx) =>
      idx === categoryIdx
        ? { ...cat, items: [...cat.items, newItem] }
        : cat
    );
    setShoppingList({
      ...shoppingList,
      shopping_list: { ...shoppingList.shopping_list, categories: updatedCategories }
    });
    setAddingToCategory(null);
    setNewItemValue("");

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('add_shopping_list_item_by_token', {
        p_token: token,
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
      await fetchSharedList();
    }
  };

  const categories = shoppingList?.shopping_list?.categories || [];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <ShoppingCart className="h-12 w-12 mx-auto text-primary animate-pulse" />
          <p className="mt-4 text-muted-foreground">Laster handleliste...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h1 className="font-serif text-xl font-bold mb-2">Handleliste ikke funnet</h1>
            <p className="text-muted-foreground">
              Denne lenken er ugyldig eller handlelisten er ikke lenger delt.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center px-4 gap-4">
          <ShoppingCart className="h-6 w-6 text-primary" />
          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-xl font-bold truncate">{shoppingList?.title}</h1>
            <p className="text-xs text-muted-foreground">
              {shoppingList && format(new Date(shoppingList.created_at), "d. MMMM yyyy", { locale: nb })}
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 pb-24">
        <div className="max-w-2xl mx-auto space-y-4">
          <Alert>
            <AlertDescription>
              Du ser på en delt handleliste. Du kan huke av og redigere varer.
            </AlertDescription>
          </Alert>

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

export default SharedShoppingList;
