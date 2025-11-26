import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { DynamicTextFields } from "@/components/recipe/DynamicTextFields";
import { IconSelector } from "@/components/recipe/IconSelector";
import { TagSelector } from "@/components/recipe/TagSelector";
import { useRecipeTags } from "@/hooks/useRecipeTags";
import { getRecipeIcon } from "@/lib/recipeIcons";
import { Trash2 } from "lucide-react";
import { z } from "zod";

const recipeSchema = z.object({
  title: z.string().trim().min(1, "Tittel er påkrevd").max(100, "Tittel må være mindre enn 100 tegn"),
  servings: z.number().min(1, "Antall personer må være minst 1").max(50, "Antall personer må være mindre enn 50"),
  icon: z.number().min(1).max(10),
  ingredients: z.array(z.string().trim().min(1, "Ingrediens kan ikke være tom")).min(1, "Minst én ingrediens er påkrevd"),
  instructions: z.array(z.string().trim().min(1, "Steg kan ikke være tomt")).min(1, "Minst ett steg er påkrevd"),
  tags: z.array(z.string().trim().min(1))
});

const EditRecipe = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [isSystemRecipe, setIsSystemRecipe] = useState(false);

  const [title, setTitle] = useState("");
  const [servings, setServings] = useState(2);
  const [selectedIcon, setSelectedIcon] = useState(1);
  const [ingredients, setIngredients] = useState<string[]>([""]);
  const [instructions, setInstructions] = useState<string[]>([""]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const { tags: availableTags, addTag } = useRecipeTags(householdId);

  useEffect(() => {
    const loadRecipe = async () => {
      if (!id) {
        navigate("/oppskrifter");
        return;
      }

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

      // Try to fetch from household_recipes first
      const { data: householdRecipe } = await supabase
        .from("household_recipes")
        .select("*")
        .eq("id", id)
        .eq("household_id", profile.current_household_id)
        .maybeSingle();

      if (householdRecipe) {
        setIsSystemRecipe(false);
        populateForm(householdRecipe);
        setLoading(false);
        return;
      }

      // If not found, check system_recipes (read-only)
      const { data: systemRecipe } = await supabase
        .from("system_recipes")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (systemRecipe) {
        setIsSystemRecipe(true);
        populateForm(systemRecipe);
        setLoading(false);
        return;
      }

      toast.error("Oppskrift ikke funnet");
      navigate("/oppskrifter");
    };

    loadRecipe();
  }, [id, navigate]);

  const populateForm = (recipe: any) => {
    setTitle(recipe.title);
    setServings(recipe.servings);
    setSelectedIcon(recipe.icon || 1);
    
    // Handle ingredients (array of strings)
    if (Array.isArray(recipe.ingredients)) {
      setIngredients(recipe.ingredients.length > 0 ? recipe.ingredients : [""]);
    }
    
    // Handle instructions (array of objects with step and instruction)
    if (Array.isArray(recipe.instructions)) {
      const instructionStrings = recipe.instructions
        .sort((a: any, b: any) => (a.step || 0) - (b.step || 0))
        .map((inst: any) => inst.instruction || "");
      setInstructions(instructionStrings.length > 0 ? instructionStrings : [""]);
    }
    
    // Handle tags
    if (Array.isArray(recipe.tags)) {
      setSelectedTags(recipe.tags);
    }
  };

  const updateIngredients = {
    add: () => setIngredients([...ingredients, ""]),
    remove: (index: number) => ingredients.length > 1 && setIngredients(ingredients.filter((_, i) => i !== index)),
    update: (index: number, value: string) => {
      const updated = [...ingredients];
      updated[index] = value;
      setIngredients(updated);
    },
  };

  const updateInstructions = {
    add: () => setInstructions([...instructions, ""]),
    remove: (index: number) => instructions.length > 1 && setInstructions(instructions.filter((_, i) => i !== index)),
    update: (index: number, value: string) => {
      const updated = [...instructions];
      updated[index] = value;
      setInstructions(updated);
    },
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags((current) =>
      current.includes(tag)
        ? current.filter((t) => t !== tag)
        : [...current, tag]
    );
  };

  const handleTagRemove = (tagToRemove: string) => {
    setSelectedTags((current) => current.filter((t) => t !== tagToRemove));
  };

  const handleNewTag = (newTag: string) => {
    const trimmedTag = newTag.trim();
    if (trimmedTag && !selectedTags.includes(trimmedTag)) {
      setSelectedTags((current) => [...current, trimmedTag]);
      addTag(trimmedTag);
    }
  };

  const handleSave = async () => {
    if (!householdId || !id || isSystemRecipe) return;

    try {
      const filteredIngredients = ingredients.filter(i => i.trim());
      const filteredInstructions = instructions.filter(i => i.trim());

      const validated = recipeSchema.parse({
        title,
        servings,
        icon: selectedIcon,
        ingredients: filteredIngredients,
        instructions: filteredInstructions,
        tags: selectedTags
      });

      setSaving(true);

      const instructionsForDb = validated.instructions.map((instruction, index) => ({
        step: index + 1,
        instruction: instruction
      }));

      const { error } = await supabase
        .from("household_recipes")
        .update({
          title: validated.title,
          servings: validated.servings,
          icon: validated.icon,
          ingredients: validated.ingredients,
          instructions: instructionsForDb,
          tags: validated.tags
        })
        .eq("id", id)
        .eq("household_id", householdId);

      if (error) throw error;

      toast.success("Oppskrift oppdatert!");
      navigate(`/oppskrifter/${id}`);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        toast.error(firstError.message);
      } else {
        console.error("Error updating recipe:", error);
        toast.error("Kunne ikke oppdatere oppskrift");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!householdId || !id || isSystemRecipe) return;

    try {
      setDeleting(true);

      const { error } = await supabase
        .from("household_recipes")
        .delete()
        .eq("id", id)
        .eq("household_id", householdId);

      if (error) throw error;

      toast.success("Oppskrift slettet!");
      navigate("/oppskrifter");
    } catch (error) {
      console.error("Error deleting recipe:", error);
      toast.error("Kunne ikke slette oppskrift");
      setDeleting(false);
    }
  };

  if (loading) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      
      <main className="flex-1 p-4 sm:p-6 pb-24">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardContent className="p-6 sm:p-8 space-y-8">
              <h2 className="font-serif text-3xl font-bold text-foreground">
                {isSystemRecipe ? "Vis oppskrift" : "Rediger oppskrift"}
              </h2>

              {isSystemRecipe && (
                <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                  Dette er en systemoppskrift og kan ikke redigeres.
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="title">Tittel</Label>
                <Input
                  id="title"
                  placeholder="F.eks. Tomat- og paprikapasta"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isSystemRecipe}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="servings">Antall personer</Label>
                <Input
                  id="servings"
                  type="number"
                  min="1"
                  max="50"
                  value={servings}
                  onChange={(e) => setServings(parseInt(e.target.value) || 1)}
                  disabled={isSystemRecipe}
                />
              </div>

              <div className="space-y-2">
                <Label>Velg ikon</Label>
                {isSystemRecipe ? (
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg border-2 border-border bg-card p-2 flex-shrink-0">
                      <img src={getRecipeIcon(selectedIcon)} alt="" className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1 h-12 rounded-lg border-2 border-border bg-muted/50 px-4 flex items-center">
                      <span className="text-muted-foreground">Kan ikke endres</span>
                    </div>
                  </div>
                ) : (
                  <IconSelector
                    selectedIcon={selectedIcon}
                    onIconSelect={setSelectedIcon}
                  />
                )}
              </div>

              <div className="space-y-2.5">
                <Label>Ingredienser *</Label>
                <DynamicTextFields
                  fields={ingredients}
                  onUpdate={updateIngredients.update}
                  onAdd={updateIngredients.add}
                  onRemove={updateIngredients.remove}
                  placeholder={() => "F.eks. 2 dl melk"}
                  addButtonLabel="Legg til ingrediens"
                  disabled={isSystemRecipe}
                />
              </div>

              <div className="space-y-2.5">
                <Label>Fremgangsmåte *</Label>
                <DynamicTextFields
                  fields={instructions}
                  onUpdate={updateInstructions.update}
                  onAdd={updateInstructions.add}
                  onRemove={updateInstructions.remove}
                  placeholder={(index) => `Steg ${index + 1}`}
                  addButtonLabel="Legg til steg"
                  disabled={isSystemRecipe}
                />
              </div>

              <div className="space-y-2.5">
                <Label>Tags</Label>
                {isSystemRecipe ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedTags.map((tag) => (
                      <div key={tag} className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm">
                        {tag}
                      </div>
                    ))}
                  </div>
                ) : (
                  <TagSelector
                    selectedTags={selectedTags}
                    availableTags={availableTags}
                    onTagToggle={handleTagToggle}
                    onTagRemove={handleTagRemove}
                    onNewTag={handleNewTag}
                  />
                )}
              </div>

              <div className="flex flex-col gap-3 pt-4">
                {!isSystemRecipe && (
                  <div className="flex gap-3">
                    <Button
                      onClick={handleSave}
                      disabled={saving || deleting}
                      size="lg"
                      className="flex-1"
                    >
                      {saving ? "Lagrer..." : "Lagre endringer"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={() => navigate(`/oppskrifter/${id}`)}
                      disabled={saving || deleting}
                    >
                      Avbryt
                    </Button>
                  </div>
                )}
                
                {isSystemRecipe && (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => navigate(`/oppskrifter/${id}`)}
                    className="w-full"
                  >
                    Tilbake
                  </Button>
                )}

                {!isSystemRecipe && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="lg" 
                        disabled={deleting}
                        className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Slett oppskrift
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Slett oppskrift?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Er du sikker på at du vil slette denne oppskriften? Dette kan ikke angres.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Avbryt</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Slett
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default EditRecipe;
