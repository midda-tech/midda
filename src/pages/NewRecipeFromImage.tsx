import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { ImageUploader, ImageFile } from "@/components/recipe/ImageUploader";
import { compressImage } from "@/lib/imageCompression";
import { useRequireAuth } from "@/hooks/useRequireAuth";

const MAX_TOTAL_COMPRESSED_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const NewRecipeFromImage = () => {
  const navigate = useNavigate();
  const { loading: authLoading } = useRequireAuth();
  const [images, setImages] = useState<ImageFile[]>([]);
  const [totalCompressedSize, setTotalCompressedSize] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const limitReached = totalCompressedSize >= MAX_TOTAL_COMPRESSED_SIZE_BYTES;

  const handleAddFiles = useCallback(async (files: File[]) => {
    setIsProcessing(true);
    
    try {
      const newImages: ImageFile[] = [];
      let additionalSize = 0;

      for (const file of files) {
        const { base64 } = await compressImage(file);
        const compressedSize = base64.length;

        if (totalCompressedSize + additionalSize + compressedSize > MAX_TOTAL_COMPRESSED_SIZE_BYTES) {
          break;
        }

        newImages.push({
          file,
          previewUrl: URL.createObjectURL(file),
          compressedBase64: base64,
          compressedSize,
        });
        additionalSize += compressedSize;
      }

      if (newImages.length > 0) {
        setImages(prev => [...prev, ...newImages]);
        setTotalCompressedSize(prev => prev + additionalSize);
      }
    } finally {
      setIsProcessing(false);
    }
  }, [totalCompressedSize]);

  const handleRemoveImage = useCallback((index: number) => {
    setImages(prev => {
      const removed = prev[index];
      if (removed) {
        URL.revokeObjectURL(removed.previewUrl);
        setTotalCompressedSize(current => current - (removed.compressedSize || 0));
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleAnalyze = async () => {
    if (images.length === 0) return;

    setIsAnalyzing(true);

    try {
      console.log("[parse-recipe] Starting with", images.length, "image(s)");

      // Use pre-compressed images
      const compressedImages = images.map(img => ({
        base64: img.compressedBase64!,
        media_type: "image/jpeg" as const,
      }));

      console.log("[parse-recipe] Using pre-compressed images, invoking function...");

      const { data, error } = await supabase.functions.invoke("parse-recipe", {
        body: { images: compressedImages },
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
                isProcessing={isProcessing}
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
                  disabled={images.length === 0 || isAnalyzing || isProcessing}
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
