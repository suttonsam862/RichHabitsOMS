/**
 * Image compression utility using HTML5 Canvas
 * Compresses images before upload to reduce file size and improve performance
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0
  maxSizeKB?: number; // Target max size in KB
  outputFormat?: 'image/jpeg' | 'image/webp' | 'image/png';
}

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  dimensions: {
    width: number;
    height: number;
  };
}

/**
 * Compresses an image file using Canvas API
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.8,
    maxSizeKB = 1024, // 1MB default
    outputFormat = 'image/jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      try {
        // Calculate new dimensions maintaining aspect ratio
        const { width: newWidth, height: newHeight } = calculateDimensions(
          img.width,
          img.height,
          maxWidth,
          maxHeight
        );

        // Set canvas dimensions
        canvas.width = newWidth;
        canvas.height = newHeight;

        // Draw and compress image
        ctx.fillStyle = '#FFFFFF'; // White background for JPEG
        ctx.fillRect(0, 0, newWidth, newHeight);
        ctx.drawImage(img, 0, 0, newWidth, newHeight);

        // Convert to blob with compression
        canvas.toBlob(
          async (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }

            let finalBlob = blob;
            let iterativeQuality = quality;

            // Iteratively compress if still too large
            while (finalBlob.size > maxSizeKB * 1024 && iterativeQuality > 0.1) {
              iterativeQuality -= 0.1;
              
              const compressedBlob = await new Promise<Blob | null>((resolve) => {
                canvas.toBlob(resolve, outputFormat, iterativeQuality);
              });

              if (compressedBlob) {
                finalBlob = compressedBlob;
              } else {
                break;
              }
            }

            // Create new file from compressed blob
            const compressedFile = new File(
              [finalBlob],
              `compressed_${file.name.replace(/\.[^/.]+$/, '.jpg')}`,
              { type: outputFormat }
            );

            const result: CompressionResult = {
              file: compressedFile,
              originalSize: file.size,
              compressedSize: finalBlob.size,
              compressionRatio: Math.round((1 - finalBlob.size / file.size) * 100),
              dimensions: {
                width: newWidth,
                height: newHeight
              }
            };

            resolve(result);
          },
          outputFormat,
          quality
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for compression'));
    };

    // Load image from file
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        img.src = e.target.result as string;
      }
    };
    reader.onerror = () => {
      reject(new Error('Failed to read image file'));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Calculate new dimensions maintaining aspect ratio
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let { width, height } = { width: originalWidth, height: originalHeight };

  // Scale down if larger than max dimensions
  if (width > maxWidth) {
    height = (height * maxWidth) / width;
    width = maxWidth;
  }

  if (height > maxHeight) {
    width = (width * maxHeight) / height;
    height = maxHeight;
  }

  return {
    width: Math.round(width),
    height: Math.round(height)
  };
}

/**
 * Batch compress multiple images
 */
export async function compressImages(
  files: File[],
  options: CompressionOptions = {}
): Promise<CompressionResult[]> {
  const results = await Promise.allSettled(
    files.map(file => compressImage(file, options))
  );

  return results
    .filter((result): result is PromiseFulfilledResult<CompressionResult> => 
      result.status === 'fulfilled'
    )
    .map(result => result.value);
}

/**
 * Check if file needs compression
 */
export function shouldCompress(file: File, maxSizeKB: number = 1024): boolean {
  return file.size > maxSizeKB * 1024 && file.type.startsWith('image/');
}

/**
 * Get optimal compression settings based on file size
 */
export function getCompressionSettings(fileSizeKB: number): CompressionOptions {
  if (fileSizeKB < 500) {
    return { quality: 0.9, maxSizeKB: 400 };
  } else if (fileSizeKB < 2000) {
    return { quality: 0.8, maxSizeKB: 800 };
  } else if (fileSizeKB < 5000) {
    return { quality: 0.7, maxSizeKB: 1200 };
  } else {
    return { quality: 0.6, maxSizeKB: 1500 };
  }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}