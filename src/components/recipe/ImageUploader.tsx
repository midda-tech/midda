import { useState, useRef, useEffect, DragEvent, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { X, ImageIcon, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageFile {
  file: File;
  previewUrl: string;
}

interface ImageUploaderProps {
  images: ImageFile[];
  onImagesChange: (images: ImageFile[]) => void;
  disabled?: boolean;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function ImageUploader({
  images,
  onImagesChange,
  disabled,
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (files: FileList | File[]) => {
    const newImages: ImageFile[] = [];
    for (const file of files) {
      if (ACCEPTED_TYPES.includes(file.type)) {
        newImages.push({ file, previewUrl: URL.createObjectURL(file) });
      }
    }
    if (newImages.length > 0) {
      onImagesChange([...images, ...newImages]);
    }
  };

  const removeImage = (index: number) => {
    const updated = [...images];
    URL.revokeObjectURL(updated[index].previewUrl);
    updated.splice(index, 1);
    onImagesChange(updated);
  };

  // Global paste listener
  useEffect(() => {
    const handlePaste = (e: globalThis.ClipboardEvent) => {
      if (disabled) return;
      
      const items = e.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length > 0) addFiles(files);
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [disabled, images]);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(e.target.files);
      e.target.value = "";
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        onChange={handleChange}
        className="hidden"
        disabled={disabled}
        multiple
      />

      {/* Image previews */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {images.map((img, index) => (
            <div key={index} className="relative">
              <img
                src={img.previewUrl}
                alt={`Bilde ${index + 1}`}
                className="w-full aspect-square rounded-lg object-cover"
              />
              <Button
                variant="secondary"
                size="icon"
                className="absolute top-1.5 right-1.5 h-7 w-7"
                onClick={() => removeImage(index)}
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Upload zone */}
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        )}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="rounded-full bg-muted p-3">
            {images.length > 0 ? (
              <Plus className="h-6 w-6 text-muted-foreground" />
            ) : (
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div>
            <p className="font-medium text-foreground text-sm">
              {images.length > 0 ? "Legg til flere bilder" : "Trykk for å velge bilder"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              eller lim inn (Ctrl+V)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
