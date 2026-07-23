export const getCroppedImg = async (
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  maxSize: number = 1000
): Promise<File> => {
  const image = await createImage(imageSrc);

  // MED-10: Max dimension check to prevent Canvas RAM exhaustion (JPEG bomb guard)
  const MAX_DIMENSION = 8000;
  if (image.naturalWidth > MAX_DIMENSION || image.naturalHeight > MAX_DIMENSION) {
    throw new Error(`Image dimensions (${image.naturalWidth}x${image.naturalHeight}) are too large. Maximum supported is ${MAX_DIMENSION}x${MAX_DIMENSION}.`);
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  // Calculate scaling factor to ensure max size is 1000x1000
  let targetWidth = pixelCrop.width;
  let targetHeight = pixelCrop.height;

  if (targetWidth > maxSize || targetHeight > maxSize) {
    if (targetWidth > targetHeight) {
      targetHeight = (targetHeight / targetWidth) * maxSize;
      targetWidth = maxSize;
    } else {
      targetWidth = (targetWidth / targetHeight) * maxSize;
      targetHeight = maxSize;
    }
  }

  canvas.width = Math.max(1, Math.round(targetWidth));
  canvas.height = Math.max(1, Math.round(targetHeight));

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    targetWidth,
    targetHeight
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'cropped.png', { type: 'image/png' });
        resolve(file);
      } else {
        reject(new Error('Canvas is empty'));
      }
    }, 'image/png'); 
  });
};

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });
