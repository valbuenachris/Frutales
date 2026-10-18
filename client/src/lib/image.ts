/** Client-side image helpers for receipt photos (comprobantes). */

const readAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
    reader.readAsDataURL(file);
  });

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('No se pudo procesar la imagen'));
    image.src = src;
  });

/**
 * Compress a photo (camera or gallery) to a compact JPEG data URL before it
 * is sent to the API: max 1000px on the longest side, quality 0.72.
 * Keeps receipts well under the server's 2 MB per-image limit.
 */
export async function compressImage(file: File, maxSize = 1000, quality = 0.72): Promise<string> {
  const dataUrl = await readAsDataUrl(file);
  const image = await loadImage(dataUrl);

  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));

  const context = canvas.getContext('2d');
  if (!context) return dataUrl; // fallback: original file as data URL
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}
