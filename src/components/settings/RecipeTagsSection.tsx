import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tag, Pencil, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";
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

interface RecipeTag {
  id: string;
  name: string;
}

interface RecipeTagsSectionProps {
  householdId: string;
}

export const RecipeTagsSection = ({ householdId }: RecipeTagsSectionProps) => {
  const [tags, setTags] = useState<RecipeTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [savingTagId, setSavingTagId] = useState<string | null>(null);

  const fetchTags = async () => {
    const { data, error } = await supabase
      .from("recipe_tags")
      .select("id, name")
      .eq("household_id", householdId)
      .order("name");

    if (error) {
      console.error("Error fetching tags:", error);
      toast.error("Kunne ikke hente tagger");
    } else {
      setTags(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTags();
  }, [householdId]);

  const handleStartEdit = (tag: RecipeTag) => {
    setEditingTagId(tag.id);
    setEditingValue(tag.name);
  };

  const handleCancelEdit = () => {
    setEditingTagId(null);
    setEditingValue("");
  };

  const handleSaveEdit = async (tagId: string) => {
    const trimmedValue = editingValue.trim().toLowerCase();
    
    if (!trimmedValue) {
      toast.error("Tagnavn kan ikke være tomt");
      return;
    }

    // Check if name already exists (excluding current tag)
    const existingTag = tags.find(
      (t) => t.id !== tagId && t.name.toLowerCase() === trimmedValue
    );
    if (existingTag) {
      toast.error("Denne taggen finnes allerede");
      return;
    }

    setSavingTagId(tagId);

    try {
      const { error } = await supabase.rpc("rename_recipe_tag", {
        p_tag_id: tagId,
        p_new_name: trimmedValue,
      });

      if (error) throw error;

      setTags((prev) =>
        prev.map((t) => (t.id === tagId ? { ...t, name: trimmedValue } : t))
      );
      setEditingTagId(null);
      setEditingValue("");
      toast.success("Tag oppdatert");
    } catch (error: any) {
      console.error("Error renaming tag:", error);
      toast.error(error.message || "Kunne ikke oppdatere tag");
    } finally {
      setSavingTagId(null);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    try {
      const { error } = await supabase.rpc("delete_recipe_tag", {
        p_tag_id: tagId,
      });

      if (error) throw error;

      setTags((prev) => prev.filter((t) => t.id !== tagId));
      toast.success("Tag slettet");
    } catch (error: any) {
      console.error("Error deleting tag:", error);
      toast.error(error.message || "Kunne ikke slette tag");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Tag className="h-5 w-5" />
            Oppskriftstagger
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Laster inn...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Tag className="h-5 w-5" />
          Oppskriftstagger
        </CardTitle>
        <CardDescription>
          Rediger eller slett tagger som brukes i oppskriftene. Nye tagger legges til når du oppretter oppskrifter.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {tags.length === 0 ? (
          <p className="text-sm text-muted-foreground italic py-4 text-center">
            Ingen tagger lagt til ennå. Legg til tagger når du oppretter oppskrifter.
          </p>
        ) : (
          <div className="space-y-2">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center gap-2 p-3 bg-background border border-border rounded-lg"
              >
                {editingTagId === tag.id ? (
                  <>
                    <Input
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSaveEdit(tag.id);
                        } else if (e.key === "Escape") {
                          handleCancelEdit();
                        }
                      }}
                      className="flex-1"
                      autoFocus
                      disabled={savingTagId === tag.id}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleSaveEdit(tag.id)}
                      disabled={savingTagId === tag.id}
                      className="h-8 w-8 text-primary"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleCancelEdit}
                      disabled={savingTagId === tag.id}
                      className="h-8 w-8 text-muted-foreground"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-foreground">{tag.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleStartEdit(tag)}
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Slett tag?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Taggen "{tag.name}" vil bli fjernet fra alle oppskrifter i husstanden. Dette kan ikke angres.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Avbryt</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteTag(tag.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Slett
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
