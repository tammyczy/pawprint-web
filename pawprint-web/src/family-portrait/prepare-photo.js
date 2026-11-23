const MAX_PHOTO_BYTES = 25_000_000;
export const MAX_UPLOAD_BYTES = 480 * 1024;
export const photoTypes = 'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif';

export async function preparePhoto(file) {
  if (file.size > MAX_PHOTO_BYTES) throw new Error('photoTooLarge');
  const supported = /^(image\/(jpeg|png|webp|hei[cf]))$/i.test(file.type) ||
    ((!file.type || file.type === 'application/octet-stream') && /\.(jpe?g|png|webp|hei[cf])$/i.test(file.name));
  if (!supported) throw new Error('invalidPhoto');

  const source = URL.createObjectURL(file);
  const image = new Image();
  try {
    image.src = source;
    await image.decode();
    return await encodePhoto(image, image.naturalWidth, image.naturalHeight);
  } finally {
    URL.revokeObjectURL(source);
  }
}

export async function encodePhoto(source, width, height) {
  if (Math.min(width, height) < 128) throw new Error('photoTooSmall');
  const scale = Math.min(1, 1440 / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  if (Math.min(canvas.width, canvas.height) < 64) throw new Error('invalidPhoto');
  const context = canvas.getContext('2d', {alpha: false});
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  for (const quality of [0.9, 0.78, 0.64, 0.5]) {
    const jpeg = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (jpeg?.size && jpeg.size <= MAX_UPLOAD_BYTES) return jpeg;
  }
  throw new Error('uploadTooLarge');
}
