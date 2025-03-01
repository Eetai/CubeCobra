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
 * Preloads a list of image URLs into the browser cache
 * @param urls - Array of image URLs to prefetch
 * @returns A promise that resolves when all images are loaded
 */
export const prefetchImages = (urls: string[]): Promise<void> => {
  if (!urls || urls.length === 0) {
    return Promise.resolve();
  }

  // Create a promise for each image
  const imagePromises = urls.map((url) => {
    return new Promise<void>((resolve) => {
      if (!url) {
        resolve();
        return;
      }
      
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => {
        console.warn(`Failed to preload image: ${url}`);
        resolve();
      };
      img.src = url;
    });
  });
  
  // Return a promise that resolves when all images are loaded
  return Promise.all(imagePromises)
    .then(() => {
      console.log(`Successfully prefetched ${urls.length} images`);
    })
    .catch((error) => {
      console.error('Error prefetching images:', error);
    });
};

/**
 * Creates a safe card object with all required properties to prevent errors
 * Simply ensures the card and card.details objects exist
 */
export const createSafeCard = (card: any): any => {
  if (!card) {
    return {
      details: {
        name: 'Unknown Card',
        type_line: 'Unknown Type',
        colors: [],
        cmc: 0,
        image_normal: '/content/default_card.png'
      }
    };
  }
  
  if (!card.details) {
    card.details = {
      name: card.name || 'Unknown Card',
      type_line: card.type_line || 'Unknown Type',
      colors: card.colors || [],
      cmc: card.cmc || 0,
      image_normal: card.imgUrl || '/content/default_card.png'
    };
  }
  
  return card;
};
