import { useState, useRef, useEffect, useCallback, DragEvent, ChangeEvent, ClipboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { X, ImageIcon, Plus, Clipboard } from "lucide-react";
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

  const addFiles = useCallback((files: FileList | File[], currentImages: ImageFile[]) => {
    const newImages: ImageFile[] = [];
    for (const file of files) {
      if (ACCEPTED_TYPES.includes(file.type)) {
        newImages.push({ file, previewUrl: URL.createObjectURL(file) });
      }
    }
    if (newImages.length > 0) {
      onImagesChange([...currentImages, ...newImages]);
    }
  }, [onImagesChange]);

  const removeImage = (index: number) => {
    const updated = [...images];
    URL.revokeObjectURL(updated[index].previewUrl);
    updated.splice(index, 1);
    onImagesChange(updated);
  };

  // Global paste listener - use ref for current images to avoid stale closure
  const imagesRef = useRef(images);
  imagesRef.current = images;

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
      if (files.length > 0) addFiles(files, imagesRef.current);
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [disabled, addFiles]);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files, images);
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
      addFiles(e.target.files, images);
      e.target.value = "";
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handlePasteFromClipboard = async () => {
    if (disabled) return;
    try {
      const clipboardItems = await navigator.clipboard.read();
      const files: File[] = [];
      for (const item of clipboardItems) {
        for (const type of item.types) {
          if (type.startsWith("image/")) {
            const blob = await item.getType(type);
            const file = new File([blob], `pasted-image.${type.split("/")[1]}`, { type });
            files.push(file);
          }
        }
      }
      if (files.length > 0) {
        addFiles(files, images);
      }
    } catch {
      // Clipboard API not available or permission denied - silently fail
    }
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
      <div className="grid grid-cols-2 gap-3">
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
            <p className="font-medium text-foreground text-sm">
              {images.length > 0 ? "Legg til flere" : "Velg bilde"}
            </p>
          </div>
        </div>

        <div
          onClick={handlePasteFromClipboard}
          className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors border-muted-foreground/25 hover:border-primary/50"
        >
          <div className="flex flex-col items-center gap-2">
            <div className="rounded-full bg-muted p-3">
              <Clipboard className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground text-sm">
              Lim inn
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
