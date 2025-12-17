import { useState, useRef, useEffect, useCallback, DragEvent, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { X, ImageIcon, Plus, Clipboard, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ImageFile {
  file: File;
  previewUrl: string;
}

interface ImageUploaderProps {
  images: ImageFile[];
  onAddFiles: (files: File[]) => Promise<void>;
  onRemoveImage: (index: number) => void;
  disabled?: boolean;
  isProcessing?: boolean;
  limitReached?: boolean;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function ImageUploader({
  images,
  onAddFiles,
  onRemoveImage,
  disabled,
  isProcessing,
  limitReached,
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const validFiles: File[] = [];
    for (const file of files) {
      if (ACCEPTED_TYPES.includes(file.type)) {
        validFiles.push(file);
      }
    }
    if (validFiles.length > 0) {
      await onAddFiles(validFiles);
    }
  }, [onAddFiles]);

  // Global paste listener
  useEffect(() => {
    const handlePaste = async (e: globalThis.ClipboardEvent) => {
      if (disabled || isProcessing) return;
      
      const items = e.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length > 0) await processFiles(files);
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [disabled, isProcessing, processFiles]);

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    await processFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      await processFiles(e.target.files);
      e.target.value = "";
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handlePasteFromClipboard = async () => {
    if (disabled || isProcessing) return;
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
        await processFiles(files);
      }
    } catch {
      // Clipboard API not available or permission denied - silently fail
    }
  };

  const isDisabled = disabled || isProcessing || limitReached;

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        onChange={handleChange}
        className="hidden"
        disabled={isDisabled}
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
                onClick={() => onRemoveImage(index)}
                disabled={isDisabled}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Limit reached message */}
      {limitReached && (
        <p className="text-sm text-muted-foreground text-center">
          Maks bildestørrelse nådd. Fjern et bilde for å legge til flere.
        </p>
      )}

      {/* Upload zone */}
      {!limitReached && (
        <div className="grid grid-cols-2 gap-3">
          <div
            onClick={isDisabled ? undefined : handleClick}
            onDrop={isDisabled ? undefined : handleDrop}
            onDragOver={isDisabled ? undefined : handleDragOver}
            onDragLeave={isDisabled ? undefined : handleDragLeave}
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
              isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            )}
          >
            <div className="flex flex-col items-center gap-2">
              <div className="rounded-full bg-muted p-3">
                {isProcessing ? (
                  <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
                ) : images.length > 0 ? (
                  <Plus className="h-6 w-6 text-muted-foreground" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <p className="font-medium text-foreground text-sm">
                {isProcessing ? "Behandler..." : "Velg bilde"}
              </p>
            </div>
          </div>

          <div
            onClick={isDisabled ? undefined : handlePasteFromClipboard}
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center transition-colors border-muted-foreground/25",
              isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-primary/50"
            )}
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
      )}
    </div>
  );
}
