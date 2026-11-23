import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {Document, NodeIO} from '@gltf-transform/core';
import {EXTTextureWebP} from '@gltf-transform/extensions';
import {BoxGeometry, CylinderGeometry} from 'three';
import sharp from 'sharp';
import {readGLB, writeGLB} from './server/glb.mjs';
import {assessModel} from './server/model-quality.mjs';
import {extraGroundContacts} from './server/model-anatomy.mjs';
import {buildModelPreview} from './server/model-textures.mjs';
import {prepareReferencePhoto, reviewReferencePhotos} from './server/reference-photos.mjs';

const read = path => readFile(new URL(path, import.meta.url));
const imageBytes = ({document, binary}, image) => {
 const {byteOffset = 0, byteLength} = document.bufferViews[image.bufferView];
 return binary.subarray(byteOffset, byteOffset + byteLength);
};

test('a persistent fifth floor-contact branch is flagged even with valid geometry', async () => {
 const fixture = async centers => {
  const positions = [], indices = [];
  const add = geometry => {
   const offset = positions.length / 3;
   positions.push(...geometry.getAttribute('position').array);
   indices.push(...geometry.getIndex().array.map(index => index + offset));
  };
  add(new BoxGeometry(.8, .38, .44).translate(0, .60, 0));
  for (const [x,z] of centers) add(new CylinderGeometry(.06, .06, .46, 16, 48).translate(x, .23, z));
  // A low tail above the floor should not be counted as a paw.
  add(new CylinderGeometry(.03, .03, .20, 16, 12).translate(-.5, .20, 0));
  const doc = new Document(), buffer = doc.createBuffer();
  const accessor = (type, values) => doc.createAccessor().setType(type).setArray(values).setBuffer(buffer);
  const primitive = doc.createPrimitive().setAttribute('POSITION', accessor('VEC3', Float32Array.from(positions)))
   .setIndices(accessor('SCALAR', Uint16Array.from(indices)));
  doc.createScene().addChild(doc.createNode().setMesh(doc.createMesh().addPrimitive(primitive)));
  return new NodeIO().writeBinary(doc);
 };
 const feet = [[-.30,-.15],[-.30,.15],[.30,-.15],[.30,.15]];
 assert.equal(extraGroundContacts(readGLB(Buffer.from(await fixture(feet)))), null);
 assert.equal(extraGroundContacts(readGLB(Buffer.from(await fixture([...feet,[-.12,-.12]])))), 5);
});

test('reference review omits an identical normalized photo and keeps a mirrored view for human review', async () => {
 const png = await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="720" height="800"><rect width="720" height="800" fill="#ccad98"/><ellipse cx="280" cy="360" rx="210" ry="200" fill="#353f50"/><circle cx="195" cy="275" r="54" fill="#edbf85"/></svg>')).png().toBuffer();
 const front = await prepareReferencePhoto(png);
 const left = await prepareReferencePhoto(await sharp(png).flop().jpeg({quality: 75}).toBuffer());
 const right = await prepareReferencePhoto(await sharp(png).negate().png().toBuffer());
 const review = await reviewReferencePhotos({front, left, back: front, right});
 assert.deepEqual(review.usedViews, ['front', 'left', 'right']);
 assert.deepEqual(review.views.back.issues, [...review.views.front.issues, 'duplicate']);
 assert.ok(review.views.left.issues.includes('similar'));
 assert.ok(!review.views.right.issues.includes('similar'));
});

test('a structurally valid static model cannot pass as a walking model', async () => {
 const bytes = await read('./models/silver-fold-cat/base-model.glb');
 const report = await assessModel(bytes, {walking: true});
 assert.equal(report.renderable, true);
 assert.equal(report.coat, true);
 assert.equal(report.walkable, false);
 assert.ok(report.issues.includes('no_walk'));

 const {document, binary} = readGLB(bytes);
 document.accessors[0].count *= 2;
 const invalid = await assessModel(writeGLB(document, binary));
 assert.equal(invalid.renderable, false);
 assert.ok(invalid.issues.includes('invalid_gltf'));
});

test('web preview is smaller with identical texture pixels and byte-identical geometry, skin and motion', async () => {
 const original = await read('./models/silver-fold-cat/model.glb');
 const preview = await buildModelPreview(original);
 assert.ok(preview.length <= original.length * 0.95);
 const source = readGLB(original), web = readGLB(preview);
 const report = await assessModel(preview, {walking: true});
 assert.equal(report.validation.errors, 0);
 assert.equal(report.walkable, true);
 for (const key of ['accessors', 'meshes', 'nodes', 'skins', 'animations', 'materials']) {
  assert.deepEqual(web.document[key], source.document[key], key);
 }
 const imageViews = new Set(source.document.images.map(image => image.bufferView));
 for (const [index, bufferView] of source.document.bufferViews.entries()) {
  if (!imageViews.has(index)) assert.ok(imageBytes(source, {bufferView: index}).equals(imageBytes(web, {bufferView: index})), `buffer view ${index}`);
  else assert.equal(web.document.bufferViews[index].buffer, bufferView.buffer);
 }
 for (const [index, image] of source.document.images.entries()) {
  const before = imageBytes(source, image), after = imageBytes(web, web.document.images[index]);
  if (before.equals(after)) continue;
  const originalPixels = await sharp(before).ensureAlpha().raw().toBuffer();
  const previewPixels = await sharp(after).ensureAlpha().raw().toBuffer();
  assert.ok(originalPixels.equals(previewPixels));
 }
});

test('Lanlao web rig passes Khronos validation and retains the authored per-joint influences', async () => {
 const original = await read('./public/models/lanlao-rig-motion-refined.glb');
 const web = await read('./public/models/lanlao-web.glb');
 const report = await assessModel(web, {walking: true});
 assert.equal(report.validation.errors, 0);
 assert.equal(report.walkable, true);
 const io = new NodeIO().registerExtensions([EXTTextureWebP]);
 const primitive = async bytes => (await io.readBinary(bytes)).getRoot().listMeshes()[0].listPrimitives()[0];
 const [before, after] = await Promise.all([primitive(original), primitive(web)]);
 for (const semantic of ['POSITION', 'NORMAL', 'TEXCOORD_0', 'JOINTS_1', 'WEIGHTS_1']) {
  assert.deepEqual(after.getAttribute(semantic).getArray(), before.getAttribute(semantic).getArray(), semantic);
 }
 const jointCount = readGLB(original).document.skins[0].joints.length;
 const influences = model => {
  const joint = model.getAttribute('JOINTS_0').getArray(), weights = model.getAttribute('WEIGHTS_0').getArray();
  const byJoint = new Float32Array(weights.length / 4 * jointCount);
  for (let i = 0; i < joint.length; i++) byJoint[Math.floor(i / 4) * jointCount + joint[i]] += weights[i];
  return byJoint;
 };
 assert.deepEqual(influences(after), influences(before));
});
