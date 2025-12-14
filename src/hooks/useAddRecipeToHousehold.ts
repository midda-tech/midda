import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Json } from "@/integrations/supabase/types";

interface RecipeData {
  title: string;
  servings: number;
  ingredients: Json;
  instructions: Json;
  tags: Json;
  icon: number | null;
}

export const useAddRecipeToHousehold = (householdId: string | null, userId: string | null) => {
  const [adding, setAdding] = useState(false);

  const addToHousehold = async (recipe: RecipeData) => {
    if (!householdId || !userId) return;
    
    setAdding(true);
    try {
      const { error } = await supabase
        .from("household_recipes")
        .insert({
          household_id: householdId,
          created_by: userId,
          title: recipe.title,
          servings: recipe.servings,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          tags: recipe.tags,
          icon: recipe.icon,
        });

      if (error) throw error;

      toast.success(`"${recipe.title}" lagt til i dine oppskrifter`);
      return true;
    } catch (error) {
      console.error("Error adding recipe:", error);
      toast.error("Kunne ikke legge til oppskrift");
      return false;
    } finally {
      setAdding(false);
    }
  };

  return { adding, addToHousehold };
};
