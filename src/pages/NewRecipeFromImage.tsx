import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { ImageUploader } from "@/components/recipe/ImageUploader";
import { compressImage } from "@/lib/imageCompression";
import { useRequireAuth } from "@/hooks/useRequireAuth";

const NewRecipeFromImage = () => {
  const navigate = useNavigate();
  const { loading: authLoading } = useRequireAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleImageSelect = (file: File) => {
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleClear = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);

    try {
      const { base64, mediaType } = await compressImage(selectedFile);

      const { data, error } = await supabase.functions.invoke("parse-recipe", {
        body: {
          images: [{ base64, media_type: mediaType }],
        },
      });

      if (error) throw error;

      if (!data?.success || !data?.recipe?.id) {
        throw new Error(data?.error || "Kunne ikke lese oppskriften");
      }

      toast.success("Oppskrift lest fra bilde!");
      navigate(`/app/oppskrifter/${data.recipe.id}/rediger`);
    } catch (error) {
      console.error("Error parsing recipe:", error);
      toast.error(
        error instanceof Error ? error.message : "Kunne ikke lese oppskriften"
      );
    } finally {
      setIsAnalyzing(false);
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
                  Last opp bilde
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Ta bilde av en oppskrift så leser vi den for deg
                </p>
              </div>

              <ImageUploader
                onImageSelect={handleImageSelect}
                onClear={handleClear}
                previewUrl={previewUrl}
                disabled={isAnalyzing}
              />

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate("/app/oppskrifter")}
                  disabled={isAnalyzing}
                >
                  Avbryt
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleAnalyze}
                  disabled={!selectedFile || isAnalyzing}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Leser oppskrift...
                    </>
                  ) : (
                    "Analyser bilde"
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

export default NewRecipeFromImage;
