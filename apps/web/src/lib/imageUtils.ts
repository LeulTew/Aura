/**
 * Resize an image blob to a maximum dimension (e.g. 1280px)
 * using OffscreenCanvas (if available) or standard Canvas.
 * This ensures the main thread stays responsive for the UI.
 */
export async function createThumbnail(blob: Blob, maxDim: number = 1280): Promise<Blob> {
  // 1. Create ImageBitmap (fast, asynchronous decoding)
  // Note: automatic EXIF rotation is generally supported by createImageBitmap in modern browsers
  const bitmap = await createImageBitmap(blob);
  
  const { width, height } = bitmap;
  
  // 2. Calculate new dimensions
  let newWidth = width;
  let newHeight = height;
  
  if (width > maxDim || height > maxDim) {
    if (width > height) {
      newWidth = maxDim;
      newHeight = Math.round(height * (maxDim / width));
    } else {
      newHeight = maxDim;
      newWidth = Math.round(width * (maxDim / height));
    }
  } else {
    // No resize needed, check optimization
    // If not resizing, we might just return original but re-compressing gives standard format
  }
  
  // 3. Use OffscreenCanvas if available (Web Worker friendly)
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(newWidth, newHeight);
    const ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
    
    // High quality scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    ctx.drawImage(bitmap, 0, 0, newWidth, newHeight);
    
    // Convert to Blob
    return canvas.convertToBlob({ type: 'image/jpeg', quality: 0.8 });
  } else {
    // Fallback to DOM Canvas
    const canvas = document.createElement('canvas');
    canvas.width = newWidth;
    canvas.height = newHeight;
    const ctx = canvas.getContext('2d')!;
    
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    ctx.drawImage(bitmap, 0, 0, newWidth, newHeight);
    
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) resolve(result);
          else reject(new Error('Canvas toBlob failed'));
        },
        'image/jpeg',
        0.8
      );
    });
  }
}
