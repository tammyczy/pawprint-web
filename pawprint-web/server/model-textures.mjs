import sharp from 'sharp';
import {readGLB, writeGLB} from './glb.mjs';

const WEBP_EXTENSION = 'EXT_texture_webp';
const imageFormats = new Set(['image/jpeg', 'image/png']);
const maxTexturePixels = 4096 ** 2;
export const MAX_PREVIEW_SOURCE_BYTES = 48 * 1024 * 1024;

// Work on buffer views directly. Re-serializing accessors through a 3D library
// can modify weights, sparse morphs or animation data even in a texture-only pass.
export async function rewriteModelTextures(bytes, reencode) {
 const {document, binary} = readGLB(bytes);
 if (!binary || document.buffers?.length !== 1 || document.buffers[0].uri || document.extensionsUsed?.length
   || !document.images?.length || !document.textures?.length || !document.bufferViews?.length) return null;

 const views = document.bufferViews;
 const ranges = views.map((view, index) => ({start: view.byteOffset ?? 0, end: (view.byteOffset ?? 0) + view.byteLength, index}));
 ranges.sort((a, b) => a.start - b.start);
 if (ranges.some(({start, end, index}, i) => views[index].buffer !== 0 || !Number.isSafeInteger(start) || !Number.isSafeInteger(end)
   || start < (ranges[i - 1]?.end ?? 0) || end <= start || end > binary.length)) return null;
 const accessorViews = new Set((document.accessors ?? []).flatMap(accessor => [
  accessor.bufferView, accessor.sparse?.indices.bufferView, accessor.sparse?.values.bufferView,
 ]));
 const imageViews = document.images.map(image => image.bufferView);
 const replacements = new Map();
 const textures = new Map();
 for (const texture of document.textures) {
  if (!textures.has(texture.source)) textures.set(texture.source, []);
  textures.get(texture.source).push(texture);
 }

 for (const [index, image] of document.images.entries()) {
  const viewIndex = image.bufferView;
  const view = views[viewIndex];
  if (!view || !imageFormats.has(image.mimeType) || !textures.has(index) || accessorViews.has(viewIndex)
    || imageViews.indexOf(viewIndex) !== imageViews.lastIndexOf(viewIndex)) continue;
  const start = view.byteOffset ?? 0;
  const source = binary.subarray(start, start + view.byteLength);
  const encoded = await reencode(source, image);
  if (!encoded || encoded.length >= source.length) continue;
  replacements.set(viewIndex, encoded);
  image.mimeType = 'image/webp';
  for (const texture of textures.get(index)) {
   delete texture.source;
   texture.extensions = {...texture.extensions, [WEBP_EXTENSION]: {source: index}};
  }
 }
 if (!replacements.size) return null;

 const chunks = [];
 let position = 0;
 for (const {start, end, index} of ranges) {
  const bytes = replacements.get(index) ?? binary.subarray(start, end);
  const view = views[index];
  view.byteOffset = position;
  view.byteLength = bytes.length;
  const padding = (4 - bytes.length % 4) % 4;
  chunks.push(bytes, Buffer.alloc(padding));
  position += bytes.length + padding;
 }
 document.buffers[0].byteLength = position;
 document.extensionsUsed = [WEBP_EXTENSION];
 document.extensionsRequired = [WEBP_EXTENSION];
 const result = writeGLB(document, Buffer.concat(chunks, position));
 return result.length < bytes.length ? result : null;
}

async function encodeWithoutPixelChanges(bytes, image) {
 // JPEGs usually expand when made lossless. The original remains embedded.
 if (image.mimeType !== 'image/png') return null;
 const input = sharp(bytes, {limitInputPixels: maxTexturePixels});
 const encoded = await input.clone().keepIccProfile().webp({lossless: true, effort: 3}).toBuffer();
 if (encoded.length >= bytes.length * 0.95) return null;
 const original = await input.ensureAlpha().raw().toBuffer();
 const decoded = await sharp(encoded, {limitInputPixels: maxTexturePixels}).ensureAlpha().raw().toBuffer();
 return original.equals(decoded) ? encoded : null;
}

export async function buildModelPreview(bytes) {
 if (bytes.length > MAX_PREVIEW_SOURCE_BYTES) return null;
 const preview = await rewriteModelTextures(bytes, async (source, image) => {
  try {
   return await encodeWithoutPixelChanges(source, image);
  } catch {
   return null;
  }
 });
 return preview && preview.length <= bytes.length * 0.95 ? preview : null;
}
