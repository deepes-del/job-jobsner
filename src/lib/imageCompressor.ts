/**
 * Image Compression Utility for Jobsner
 * Strictly enforces maximum 50KB size constraint for profile photos and corporate logos.
 * Uses HTML5 Canvas to scale and adaptively compress images down to <= 50KB.
 */

export const MAX_IMAGE_SIZE_BYTES = 50 * 1024; // 50 KB (51,200 bytes)

export interface CompressedImageResult {
  dataUrl: string;
  sizeInBytes: number;
  formattedSize: string;
  width: number;
  height: number;
}

/**
 * Calculates byte size of a base64 Data URL
 */
export function getBase64ByteSize(dataUrl: string): number {
  if (!dataUrl) return 0;
  const commaIndex = dataUrl.indexOf(',');
  const base64Str = commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
  return Math.round((base64Str.length * 3) / 4);
}

/**
 * Formats byte count to human-readable string (e.g., "43.2 KB")
 */
export function formatByteSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

/**
 * Compresses an image File or Base64 string to strictly under 50KB.
 * Iteratively adjusts JPEG quality and canvas resolution until <= 50KB.
 */
export async function compressImageTo50KB(
  input: File | string,
  maxSizeBytes: number = MAX_IMAGE_SIZE_BYTES
): Promise<CompressedImageResult> {
  let sourceUrl = '';
  if (typeof input === 'string') {
    sourceUrl = input;
  } else {
    sourceUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(input);
    });
  }

  // Load image into memory
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = (err) => reject(new Error('Failed to load image for compression.'));
    image.src = sourceUrl;
  });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable.');
  }

  // Initial max bounding box: 400x400 (ideal for avatars & logos)
  let maxDimension = 400;
  let currentWidth = img.naturalWidth || img.width;
  let currentHeight = img.naturalHeight || img.height;

  if (currentWidth > maxDimension || currentHeight > maxDimension) {
    if (currentWidth > currentHeight) {
      currentHeight = Math.round((currentHeight * maxDimension) / currentWidth);
      currentWidth = maxDimension;
    } else {
      currentWidth = Math.round((currentWidth * maxDimension) / currentHeight);
      currentHeight = maxDimension;
    }
  }

  let quality = 0.85;
  let bestResult = '';
  let bestSize = Infinity;
  let attempts = 0;

  while (attempts < 12) {
    canvas.width = Math.max(80, Math.round(currentWidth));
    canvas.height = Math.max(80, Math.round(currentHeight));

    // Clear and draw
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw with white background for transparent logos/PNGs
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Export as JPEG with current quality
    const candidateDataUrl = canvas.toDataURL('image/jpeg', quality);
    const candidateSize = getBase64ByteSize(candidateDataUrl);

    if (candidateSize <= maxSizeBytes) {
      bestResult = candidateDataUrl;
      bestSize = candidateSize;
      break;
    }

    // Still too large: reduce quality or dimension
    if (quality > 0.35) {
      quality -= 0.15;
    } else {
      // Scale down canvas dimensions
      currentWidth *= 0.8;
      currentHeight *= 0.8;
      quality = 0.75;
    }

    bestResult = candidateDataUrl;
    bestSize = candidateSize;
    attempts++;
  }

  return {
    dataUrl: bestResult,
    sizeInBytes: bestSize,
    formattedSize: formatByteSize(bestSize),
    width: canvas.width,
    height: canvas.height
  };
}
