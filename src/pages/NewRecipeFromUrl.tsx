import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { useRequireAuth } from "@/hooks/useRequireAuth";

const NewRecipeFromUrl = () => {
  const navigate = useNavigate();
  const { loading: authLoading } = useRequireAuth();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !url.trim()) return;

    setIsLoading(true);

    try {
      console.log("[parse-recipe-url] Starting with:", { url: url.trim(), title: title.trim() });

      const { data, error } = await supabase.functions.invoke("parse-recipe-url", {
        body: { 
          url: url.trim(),
          title: title.trim(),
        },
      });

      console.log("[parse-recipe-url] Response received:", data);

      if (error) throw error;

      if (!data?.success || !data?.recipe) {
        console.error("[parse-recipe-url] Invalid response structure:", {
          hasSuccess: data?.success,
          hasRecipe: !!data?.recipe,
          fullResponse: data,
        });
        throw new Error(data?.error || "Kunne ikke lese oppskriften");
      }

      toast.success("Oppskrift lest fra URL!");
      navigate("/app/oppskrifter/ny", { state: { parsedRecipe: data.recipe } });
    } catch (error) {
      console.error("[parse-recipe-url] Error:", {
        error,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
      toast.error(
        error instanceof Error ? error.message : "Kunne ikke lese oppskriften",
        { duration: 10000 }
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />

      <main className="flex-1 p-4 sm:p-6 pb-24">
        <div className="max-w-xl mx-auto">
          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="text-center">
                <h2 className="font-serif text-2xl font-bold text-foreground">
                  Legg til fra URL
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Lim inn en lenke til en oppskrift så leser Midda den inn for deg.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Tittel</Label>
                  <Input
                    id="title"
                    placeholder="F.eks. Lasagne"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="url">URL</Label>
                  <Input
                    id="url"
                    type="url"
                    placeholder="https://..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate("/app/oppskrifter")}
                  disabled={isLoading}
                >
                  Avbryt
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={!title.trim() || !url.trim() || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Leser oppskrift...
                    </>
                  ) : (
                    "Les inn"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default NewRecipeFromUrl;
