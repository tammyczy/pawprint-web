import sharp from 'sharp';
import {createHash} from 'node:crypto';
import {PHOTO_VIEWS} from './modeling-plan.mjs';

const thumbnailSize = 96;
const inputOptions = {limitInputPixels: 24_000_000, failOn: 'warning'};

export async function prepareReferencePhoto(input) {
 const image = sharp(input, inputOptions);
 const {format, width, height, pages} = await image.metadata();
 if (!['jpeg', 'png', 'webp'].includes(format) || pages > 1 || width < 256 || height < 256) {
  throw new Error('Invalid reference photo');
 }
 return image.rotate().resize(2048, 2048, {fit: 'inside', withoutEnlargement: true})
  .toColourspace('srgb').png().toBuffer();
}

async function describePhoto(bytes) {
 const image = sharp(bytes, inputOptions);
 const {width, height} = await image.metadata();
 const rgb = await image.resize(thumbnailSize, thumbnailSize, {fit: 'fill'})
  .flatten({background: '#f2f2f2'}).toColourspace('srgb').raw().toBuffer();
 const luma = pixel => 0.2126 * rgb[pixel] + 0.7152 * rgb[pixel + 1] + 0.0722 * rgb[pixel + 2];
 const row = thumbnailSize * 3;
 let detail = 0, light = 0, clipped = 0;
 for (let y = 1; y < thumbnailSize - 1; y++) {
  for (let x = 1; x < thumbnailSize - 1; x++) {
   const i = y * row + x * 3;
   const value = luma(i);
   detail += Math.abs(4 * value - luma(i - 3) - luma(i + 3) - luma(i - row) - luma(i + row));
   light += value;
   clipped += value >= 249;
  }
 }
 const area = (thumbnailSize - 2) ** 2;
 const issues = [];
 if (Math.min(width, height) < 640) issues.push('small');
 if (detail / area < 1.5) issues.push('low_detail');
 if (light / area < 65) issues.push('dark');
 if (clipped / area > 0.88) issues.push('bright');
 return {width, height, issues, rgb, hash: createHash('sha256').update(bytes).digest('hex')};
}

function similarFraming(a, b, mirror) {
 if (Math.abs(Math.log((a.width / a.height) / (b.width / b.height))) > 0.035) return false;
 let total = 0, center = 0;
 for (let y = 0; y < thumbnailSize; y++) {
  for (let x = 0; x < thumbnailSize; x++) {
   const i = (y * thumbnailSize + x) * 3;
   const j = (y * thumbnailSize + (mirror ? thumbnailSize - 1 - x : x)) * 3;
   const difference = (Math.abs(a.rgb[i] - b.rgb[j]) + Math.abs(a.rgb[i + 1] - b.rgb[j + 1]) + Math.abs(a.rgb[i + 2] - b.rgb[j + 2])) / 3;
   total += difference;
   if (x >= 19 && x < 77 && y >= 12 && y < 84) center += difference;
  }
 }
 return total / thumbnailSize ** 2 <= 3.5 && center / (58 * 72) <= 4.5;
}

// Only identical, normalized PNGs are omitted. Similar framing and exposure are advice.
export async function reviewReferencePhotos(photos) {
 const views = {}, usedViews = [], submitted = new Map();
 for (const view of PHOTO_VIEWS) {
  if (!photos[view]) continue;
  const summary = await describePhoto(photos[view]);
  const {width, height, issues} = summary;
  const previous = [...submitted].find(([, other]) => other.hash === summary.hash);
  if (previous) {
   views[view] = {width, height, issues: [...issues, 'duplicate'], matches: previous[0]};
   continue;
  }
  const similar = [...submitted].find(([, other]) => similarFraming(summary, other, false) || similarFraming(summary, other, true));
  views[view] = similar ? {width, height, issues: [...issues, 'similar'], matches: similar[0]} : {width, height, issues};
  usedViews.push(view);
  submitted.set(view, summary);
 }
 return {views, usedViews};
}
