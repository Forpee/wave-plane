const imagesLoaded = require('imagesloaded');

// Preload images
export function preloadImages() {
  return new Promise((resolve, reject) => {
    imagesLoaded(document.querySelectorAll('.item__img, .slideshow__img'), { background: true }, resolve);
  });
};