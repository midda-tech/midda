import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { ImageUploader, ImageFile } from "@/components/recipe/ImageUploader";
import { useRequireAuth } from "@/hooks/useRequireAuth";

const MAX_TOTAL_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const NewRecipeFromImage = () => {
  const navigate = useNavigate();
  const { loading: authLoading } = useRequireAuth();
  const [images, setImages] = useState<ImageFile[]>([]);
  const [totalSize, setTotalSize] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const limitReached = totalSize >= MAX_TOTAL_SIZE_BYTES;

  const handleAddFiles = useCallback(async (files: File[]) => {
    const newImages: ImageFile[] = [];
    let additionalSize = 0;

    for (const file of files) {
      if (totalSize + additionalSize + file.size > MAX_TOTAL_SIZE_BYTES) {
        break;
      }

      newImages.push({
        file,
        previewUrl: URL.createObjectURL(file),
      });
      additionalSize += file.size;
    }

    if (newImages.length > 0) {
      setImages(prev => [...prev, ...newImages]);
      setTotalSize(prev => prev + additionalSize);
    }
  }, [totalSize]);

  const handleRemoveImage = useCallback((index: number) => {
    setImages(prev => {
      const removed = prev[index];
      if (removed) {
        URL.revokeObjectURL(removed.previewUrl);
        setTotalSize(current => current - removed.file.size);
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleAnalyze = async () => {
    if (images.length === 0) return;

    setIsAnalyzing(true);

    try {
      console.log("[parse-recipe] Starting with", images.length, "image(s)");

      const imageData = await Promise.all(
        images.map(async (img) => ({
          base64: await fileToBase64(img.file),
          media_type: img.file.type as "image/jpeg" | "image/png" | "image/webp",
        }))
      );

      console.log("[parse-recipe] Invoking function...");

      const { data, error } = await supabase.functions.invoke("parse-recipe", {
        body: { images: imageData },
      });

      console.log("[parse-recipe] Response received:", data);

      if (error) throw error;

      if (!data?.success || !data?.recipe) {
        console.error("[parse-recipe] Invalid response structure:", {
          hasSuccess: data?.success,
          hasRecipe: !!data?.recipe,
          fullResponse: data,
        });
        throw new Error(data?.error || "Kunne ikke lese oppskriften");
      }

      toast.success("Oppskrift lest fra bilde!");
      navigate("/app/oppskrifter/ny", { state: { parsedRecipe: data.recipe } });
    } catch (error) {
      console.error("[parse-recipe] Error:", {
        error,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
      toast.error(
        error instanceof Error ? error.message : "Kunne ikke lese oppskriften",
        { duration: 10000 }
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
                  Last opp bilder
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Last opp ett eller flere bilder av en oppskrift så leser vi inn oppskriften for deg.
                </p>
              </div>

              <ImageUploader
                images={images}
                onAddFiles={handleAddFiles}
                onRemoveImage={handleRemoveImage}
                disabled={isAnalyzing}
                limitReached={limitReached}
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
                  disabled={images.length === 0 || isAnalyzing}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Leser oppskrift...
                    </>
                  ) : (
                    `Les inn ${images.length > 0 ? `(${images.length})` : ""}`
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
