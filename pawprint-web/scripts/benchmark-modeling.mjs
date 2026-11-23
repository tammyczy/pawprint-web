import {readFile} from 'node:fs/promises';
import sharp from 'sharp';
import {assessModel} from '../server/model-quality.mjs';
import {buildModelPreview, rewriteModelTextures} from '../server/model-textures.mjs';

const fixtures = [
 'public/models/lanlao-base.glb',
 'models/xiaoq/model.glb',
 'models/silver-fold-cat/model.glb',
 'models/silver-fold-cat/model-cat-pawlock-whiskers-v2.glb',
];
const alternatives = [
 ['Near-lossless WebP', {nearLossless: true, quality: 90}],
 ['WebP Q92', {quality: 92, smartSubsample: true}],
];
const pixels = bytes => sharp(bytes, {limitInputPixels: 4096 ** 2}).ensureAlpha().raw().toBuffer();
const rows = [];

for (const file of process.argv.length > 2 ? process.argv.slice(2) : fixtures) {
 const original = await readFile(file);
 const measure = async (method, result, maxRMSE = 0) => {
  const report = await assessModel(result);
  rows.push({file, method, bytes: result.length, savedPercent: (100 * (1 - result.length / original.length)).toFixed(1),
   maxRMSE: maxRMSE.toFixed(3), gltfErrors: report.validation?.errors ?? '—'});
 };
 await measure('Original', original);
 await measure('Lossless preview', await buildModelPreview(original) ?? original);
 for (const [method, options] of alternatives) {
  let maxRMSE = 0;
  const candidate = await rewriteModelTextures(original, async source => {
   const next = await sharp(source, {limitInputPixels: 4096 ** 2}).webp({...options, effort: 4}).toBuffer();
   if (next.length >= source.length * 0.95) return null;
   const [a, b] = await Promise.all([pixels(source), pixels(next)]);
   let squareError = 0;
   for (let i = 0; i < a.length; i++) squareError += (a[i] - b[i]) ** 2;
   maxRMSE = Math.max(maxRMSE, Math.sqrt(squareError / a.length));
   return next;
  });
  await measure(method, candidate ?? original, candidate ? maxRMSE : 0);
 }
}

console.table(rows);
