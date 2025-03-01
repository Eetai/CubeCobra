/**
 * Utility for prefetching images to improve user experience
 */

/**
 * Prefetches an image by creating a new Image object and setting its src
 * This will cause the browser to cache the image for future use
 */
export const prefetchImage = (src: string): Promise<void> => {
  return new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => {
      // Log the error but still resolve to prevent blocking
      console.warn(`Failed to preload image: ${src}`);
      resolve();
    };
    img.src = src;
  });
};

/**
 * Prefetches an array of images, with optional concurrency limit
 */
export const prefetchImages = async (
  sources: string[], 
  concurrencyLimit = 4
): Promise<void> => {
  if (!sources.length) return;

  // Filter out empty or undefined sources
  const validSources = sources.filter(Boolean);
  
  // Process in batches to limit concurrent requests
  for (let i = 0; i < validSources.length; i += concurrencyLimit) {
    const batch = validSources.slice(i, i + concurrencyLimit);
    await Promise.allSettled(
      batch.map(src => prefetchImage(src))
    );
  }
};
