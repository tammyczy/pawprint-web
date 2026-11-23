import {readPackedAccessor} from './glb.mjs';

// Inspect the upright, single-mesh format emitted by Tripo. For other mesh
// layouts the regular visual review still applies.
export function extraGroundContacts(glb) {
 const {document} = glb;
 const roots = document.scenes?.[document.scene ?? 0]?.nodes;
 const node = roots?.length === 1 && document.nodes?.[roots[0]];
 if (!node || node.children?.length || node.rotation || node.matrix || node.scale || node.skin !== undefined) return null;
 const primitives = document.meshes?.[node.mesh]?.primitives;
 const primitive = primitives?.length === 1 && primitives[0];
 if (!primitive || (primitive.mode ?? 4) !== 4) return null;
 const xyz = readPackedAccessor(glb, primitive.attributes.POSITION);
 const indices = readPackedAccessor(glb, primitive.indices);
 if (!(xyz instanceof Float32Array) || !indices || indices.length % 3 || xyz.length > 300_000) return null;

 let bottom = Infinity, top = -Infinity;
 for (let i = 1; i < xyz.length; i += 3) {
  bottom = Math.min(bottom, xyz[i]);
  top = Math.max(top, xyz[i]);
 }
 const height = top - bottom;
 if (!Number.isFinite(height) || height <= 0) return null;

 // Weld coincident UV seam vertices so one foot is counted once.
 const points = [], cells = new Map(), welded = new Uint32Array(xyz.length / 3);
 const precision = 100_000 / height;
 for (let i = 0; i < welded.length; i++) {
  const point = [xyz[i * 3], xyz[i * 3 + 1] - bottom, xyz[i * 3 + 2]];
  const key = point.map(value => Math.round(value * precision)).join(',');
  if (!cells.has(key)) {
   cells.set(key, points.length);
   points.push(point);
  }
  welded[i] = cells.get(key);
 }
 const floor = countAt(.045 * height);
 return floor > 4 && countAt(.09 * height) === floor ? floor : null;

 function countAt(cut) {
  const parents = Int32Array.from(points, ([, y], index) => y <= cut ? index : -1);
  const root = index => {
   while (parents[index] !== index) {
    parents[index] = parents[parents[index]];
    index = parents[index];
   }
   return index;
  };
  const join = (first, second) => {
   if (parents[first] >= 0 && parents[second] >= 0) parents[root(second)] = root(first);
  };
  const referenced = new Uint8Array(points.length);
  for (let i = 0; i < indices.length; i += 3) {
   const a = welded[indices[i]], b = welded[indices[i + 1]], c = welded[indices[i + 2]];
   referenced[a] = referenced[b] = referenced[c] = 1;
   join(a, b);
   join(b, c);
   join(c, a);
  }
  const regions = new Map();
  for (let i = 0; i < points.length; i++) {
   if (parents[i] < 0 || !referenced[i]) continue;
   const id = root(i), [x, y, z] = points[i];
   const region = regions.get(id) ?? {size: 0, minX: x, maxX: x, minZ: z, maxZ: z, minY: y, maxY: y};
   region.size++;
   region.minX = Math.min(region.minX, x);
   region.maxX = Math.max(region.maxX, x);
   region.minZ = Math.min(region.minZ, z);
   region.maxZ = Math.max(region.maxZ, z);
   region.minY = Math.min(region.minY, y);
   region.maxY = Math.max(region.maxY, y);
   regions.set(id, region);
  }
  return [...regions.values()].filter(region => region.size >= 16
   && region.minY <= height * .02 && region.maxY >= cut * .78
   && region.maxX - region.minX >= height * .036 && region.maxZ - region.minZ >= height * .036).length;
 }
}
