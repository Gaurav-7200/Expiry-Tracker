/**
 * Resizes an image file client-side to at most maxDimension on its longest side
 * and encodes it as a JPEG data URL at the given quality.
 *
 * @param {File} file - The image file from an <input type="file">
 * @param {number} maxDimension - Max width or height in pixels (default 300)
 * @param {number} quality - JPEG quality between 0 and 1 (default 0.8)
 * @returns {Promise<string>} Base64 data URL of the resized JPEG
 */
export function resizeImageToDataUrl(file, maxDimension = 300, quality = 0.8) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file provided'));
      return;
    }
    if (!file.type || !file.type.startsWith('image/')) {
      reject(new Error('Selected file is not an image'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image for processing'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas 2D context'));
          return;
        }

        // Fill white background for transparent PNGs before converting to JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        try {
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        } catch (err) {
          reject(err);
        }
      };
      img.src = readerEvent.target.result;
    };
    reader.readAsDataURL(file);
  });
}

