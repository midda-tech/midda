import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { X, Check } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { getRecipeIcon } from "@/lib/recipeIcons";
import { DynamicTextFields } from "@/components/recipe/DynamicTextFields";
import { z } from "zod";

const recipeSchema = z.object({
  title: z.string().trim().min(1, "Tittel er påkrevd").max(100, "Tittel må være mindre enn 100 tegn"),
  servings: z.number().min(1, "Antall personer må være minst 1").max(50, "Antall personer må være mindre enn 50"),
  icon: z.number().min(1).max(10),
  ingredients: z.array(z.string().trim().min(1, "Ingrediens kan ikke være tom")).min(1, "Minst én ingrediens er påkrevd"),
  instructions: z.array(z.string().trim().min(1, "Steg kan ikke være tomt")).min(1, "Minst ett steg er påkrevd"),
  tags: z.array(z.string().trim().min(1))
});

const NewRecipe = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [servings, setServings] = useState(2);
  const [selectedIcon, setSelectedIcon] = useState(1);
  const [ingredients, setIngredients] = useState<string[]>([""]);
  const [instructions, setInstructions] = useState<string[]>([""]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [tagSearchOpen, setTagSearchOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setUserId(session.user.id);

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
      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

  // Fetch all unique tags from both system and household recipes
  useEffect(() => {
    const fetchTags = async () => {
      if (!householdId) return;

      const [systemResult, householdResult] = await Promise.all([
        supabase.from("system_recipes").select("tags"),
        supabase.from("household_recipes").select("tags").eq("household_id", householdId)
      ]);

      const allTags = new Set<string>();
      
      [...(systemResult.data || []), ...(householdResult.data || [])].forEach((recipe) => {
        if (Array.isArray(recipe.tags)) {
          recipe.tags.forEach((tag: string) => {
            if (tag && tag.trim()) {
              allTags.add(tag.trim());
            }
          });
        }
      });

      setAvailableTags(Array.from(allTags).sort());
    };

    fetchTags();
  }, [householdId]);

  const updateField = (fields: string[], setFields: (fields: string[]) => void) => ({
    add: () => setFields([...fields, ""]),
    remove: (index: number) => fields.length > 1 && setFields(fields.filter((_, i) => i !== index)),
    update: (index: number, value: string) => {
      const updated = [...fields];
      updated[index] = value;
      setFields(updated);
    },
  });

  const toggleTag = (tag: string) => {
    setSelectedTags((current) =>
      current.includes(tag)
        ? current.filter((t) => t !== tag)
        : [...current, tag]
    );
  };

  const removeTag = (tagToRemove: string) => {
    setSelectedTags((current) => current.filter((t) => t !== tagToRemove));
  };

  const addNewTag = (newTag: string) => {
    const trimmedTag = newTag.trim();
    if (trimmedTag && !selectedTags.includes(trimmedTag)) {
      setSelectedTags((current) => [...current, trimmedTag]);
      if (!availableTags.includes(trimmedTag)) {
        setAvailableTags((current) => [...current, trimmedTag].sort());
      }
    }
  };

  const handleSave = async () => {
    if (!householdId || !userId) return;

    try {
      // Filter out empty values
      const filteredIngredients = ingredients.filter(i => i.trim());
      const filteredInstructions = instructions.filter(i => i.trim());

      // Validate
      const validated = recipeSchema.parse({
        title,
        servings,
        icon: selectedIcon,
        ingredients: filteredIngredients,
        instructions: filteredInstructions,
        tags: selectedTags
      });

      setSaving(true);

      const { error } = await supabase
        .from("household_recipes")
        .insert({
          household_id: householdId,
          created_by: userId,
          title: validated.title,
          servings: validated.servings,
          icon: validated.icon,
          ingredients: validated.ingredients,
          instructions: validated.instructions,
          tags: validated.tags
        });

      if (error) throw error;

      toast.success("Oppskrift lagret!");
      navigate("/oppskrifter");
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        toast.error(firstError.message);
      } else {
        console.error("Error saving recipe:", error);
        toast.error("Kunne ikke lagre oppskrift");
      }
    } finally {
      setSaving(false);
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
                Legg til ny oppskrift
              </h2>

              <div className="space-y-2">
                <Label htmlFor="title">Tittel</Label>
                <Input
                  id="title"
                  placeholder="F.eks. Tomat- og paprikapasta"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
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
                />
              </div>

              <div className="space-y-2">
                <Label>Velg ikon</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-start gap-3 h-12"
                    >
                      <img src={getRecipeIcon(selectedIcon)} alt="" className="h-6 w-6" />
                      <span className="text-muted-foreground">Velg ikon for oppskriften</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-3" align="start">
                    <div className="grid grid-cols-5 gap-2">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((iconNum) => (
                        <button
                          key={iconNum}
                          type="button"
                          onClick={() => {
                            setSelectedIcon(iconNum);
                          }}
                          className={`aspect-square rounded-lg border-2 p-2 transition-all hover:scale-105 ${
                            selectedIcon === iconNum
                              ? "border-primary bg-primary/5"
                              : "border-border bg-card hover:border-primary/50"
                          }`}
                        >
                          <img src={getRecipeIcon(iconNum)} alt="" className="w-full h-full object-contain" />
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2.5">
                <Label>Ingredienser *</Label>
                <DynamicTextFields
                  fields={ingredients}
                  onUpdate={updateField(ingredients, setIngredients).update}
                  onAdd={updateField(ingredients, setIngredients).add}
                  onRemove={updateField(ingredients, setIngredients).remove}
                  placeholder={() => "F.eks. 2 dl melk"}
                  addButtonLabel="Legg til ingrediens"
                />
              </div>

              <div className="space-y-2.5">
                <Label>Fremgangsmåte *</Label>
                <DynamicTextFields
                  fields={instructions}
                  onUpdate={updateField(instructions, setInstructions).update}
                  onAdd={updateField(instructions, setInstructions).add}
                  onRemove={updateField(instructions, setInstructions).remove}
                  placeholder={(index) => `Steg ${index + 1}`}
                  addButtonLabel="Legg til steg"
                />
              </div>

              <div className="space-y-3">
                <Label>Tags</Label>
                <Popover open={tagSearchOpen} onOpenChange={setTagSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between h-auto min-h-[2.5rem] py-2"
                    >
                      <span className="text-muted-foreground">
                        Velg eller legg til tag
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start" side="top">
                    <Command>
                      <CommandInput 
                        placeholder="Søk eller skriv ny tag..." 
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const value = e.currentTarget.value;
                            if (value) {
                              addNewTag(value);
                              e.currentTarget.value = "";
                            }
                          }
                        }}
                      />
                      <CommandList className="max-h-[120px] overflow-y-auto">
                        <CommandEmpty className="py-2 px-3 text-sm">
                          Trykk Enter for å legge til ny tag
                        </CommandEmpty>
                        <CommandGroup>
                          {availableTags.map((tag) => (
                            <CommandItem
                              key={tag}
                              value={tag}
                              onSelect={() => {
                                toggleTag(tag);
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  selectedTags.includes(tag) ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              {tag}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                
                {selectedTags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedTags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="gap-1"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  size="lg"
                  className="flex-1"
                >
                  {saving ? "Lagrer..." : "Lagre oppskrift"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => navigate("/oppskrifter")}
                  disabled={saving}
                >
                  Avbryt
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default NewRecipe;
