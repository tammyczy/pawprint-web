import {readFile, rename, writeFile} from 'node:fs/promises';
import sharp from 'sharp';
import {readGLB} from '../server/glb.mjs';
import {assessModel} from '../server/model-quality.mjs';
import {rewriteModelTextures} from '../server/model-textures.mjs';

const source = new URL('../public/models/lanlao-rig-motion-refined.glb', import.meta.url);
const target = new URL('../public/models/lanlao-web.glb', import.meta.url);
const temporary = new URL('./lanlao-web.glb.tmp', target);
const quality = {basecolor: 82, normal: 92, rm: 90};

const original = await readFile(source);
const {document, binary} = readGLB(original);
const primitive = document.meshes[0].primitives[0];
const joints = document.accessors[primitive.attributes.JOINTS_0];
const weights = document.accessors[primitive.attributes.WEIGHTS_0];
if (joints.componentType !== 5121 || weights.componentType !== 5126 || joints.count !== weights.count
  || joints.type !== 'VEC4' || weights.type !== 'VEC4' || joints.sparse || weights.sparse) {
 throw new Error('Unexpected Lanlao skin layout');
}
const jointsView = document.bufferViews[joints.bufferView], weightsView = document.bufferViews[weights.bufferView];
let duplicates = 0;
for (let vertex = 0; vertex < weights.count; vertex++) {
 const jointStart = (jointsView.byteOffset ?? 0) + (joints.byteOffset ?? 0) + vertex * (jointsView.byteStride ?? 4);
 const weightStart = (weightsView.byteOffset ?? 0) + (weights.byteOffset ?? 0) + vertex * (weightsView.byteStride ?? 16);
 const firstSlot = new Map();
 for (let slot = 0; slot < 4; slot++) {
  const weightOffset = weightStart + slot * 4;
  const weight = binary.readFloatLE(weightOffset);
  if (weight === 0) continue;
  const joint = binary[jointStart + slot];
  if (!firstSlot.has(joint)) {
   firstSlot.set(joint, weightOffset);
   continue;
  }
  const first = firstSlot.get(joint);
  binary.writeFloatLE(binary.readFloatLE(first) + weight, first);
  binary.writeFloatLE(0, weightOffset);
  binary[jointStart + slot] = 0;
  duplicates++;
 }
}
const preview = await rewriteModelTextures(original, async (bytes, image) => {
 const kind = Object.keys(quality).find(key => image.name?.endsWith(key));
 if (!kind) throw new Error(`Unexpected texture: ${image.name}`);
 const webp = await sharp(bytes).webp({quality: quality[kind], effort: 6, smartSubsample: true}).toBuffer();
 return webp.length < bytes.length * 0.9 ? webp : null;
});
if (!preview) throw new Error('No smaller preview was produced');
const review = await assessModel(preview, {walking: true});
if (!review.renderable || !review.coat || !review.walkable) throw new Error(JSON.stringify(review));
await writeFile(temporary, preview);
await rename(temporary, target);
console.log(`Lanlao: ${original.length} → ${preview.length} bytes; ${duplicates} duplicate influences merged; ${review.validation.errors} glTF errors`);
