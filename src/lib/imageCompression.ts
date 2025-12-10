const MAX_SIZE_BYTES = 1024 * 1024; // 1MB
const MAX_DIMENSION = 1500;
const JPEG_QUALITY = 0.75;

interface CompressionResult {
  base64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp";
}

export async function compressImage(file: File): Promise<CompressionResult> {
  const originalMediaType = file.type as CompressionResult["mediaType"];
  
  // If file is small enough, return original as base64
  if (file.size <= MAX_SIZE_BYTES) {
    const base64 = await fileToBase64(file);
    return { base64, mediaType: originalMediaType };
  }

  // Compress the image
  const img = await loadImage(file);
  const { width, height } = calculateDimensions(img.width, img.height);
  
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");
  
  ctx.drawImage(img, 0, 0, width, height);
  
  // Convert to JPEG for compression
  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  const base64 = dataUrl.split(",")[1];
  
  return { base64, mediaType: "image/jpeg" };
}

function fileToBase64(file: File): Promise<string> {
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
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function calculateDimensions(width: number, height: number): { width: number; height: number } {
  if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) {
    return { width, height };
  }
  
  const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}
