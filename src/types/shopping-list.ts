export interface ShoppingListCategory {
  name: string;
  items: string[];
}

export interface ShoppingListData {
  categories: ShoppingListCategory[];
}

export interface ShoppingList {
  id: string;
  title: string;
  shopping_list: ShoppingListData | null;
  created_at: string;
}
