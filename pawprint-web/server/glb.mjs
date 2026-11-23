const GLB_MAGIC = 0x46546c67;
const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;

export function readGLB(bytes) {
 if (bytes.length < 20 || bytes.readUInt32LE(0) !== GLB_MAGIC || bytes.readUInt32LE(4) !== 2
   || bytes.readUInt32LE(8) !== bytes.length || bytes.readUInt32LE(16) !== JSON_CHUNK) throw new Error('Invalid GLB');
 const jsonLength = bytes.readUInt32LE(12);
 const nextChunk = 20 + jsonLength;
 if (nextChunk > bytes.length || jsonLength % 4 !== 0) throw new Error('Invalid GLB JSON');
 const document = JSON.parse(bytes.toString('utf8', 20, nextChunk));
 if (!document || typeof document !== 'object' || Array.isArray(document)) throw new Error('Invalid GLB document');
 for (const resource of [...document.buffers ?? [], ...document.images ?? []]) {
  if (resource?.uri !== undefined && (typeof resource.uri !== 'string' || !resource.uri.startsWith('data:'))) {
   throw new Error('External GLB resources are not allowed');
  }
 }
 const hasBinChunk = nextChunk + 8 <= bytes.length && bytes.readUInt32LE(nextChunk + 4) === BIN_CHUNK;
 const binLength = hasBinChunk ? bytes.readUInt32LE(nextChunk) : 0;
 const binary = hasBinChunk && nextChunk + 8 + binLength === bytes.length && binLength % 4 === 0
  ? bytes.subarray(nextChunk + 8) : null;
 return {document, binary};
}

export function summarizeGLB(document) {
 return {
  animations: (document.animations ?? []).map(animation => animation.name || 'Unnamed'),
  meshes: document.meshes?.length ?? 0,
  materials: document.materials?.length ?? 0,
  skins: document.skins?.length ?? 0,
  joints: (document.skins ?? []).reduce((sum, skin) => sum + skin.joints.length, 0),
 };
}

export function inspectGLB(bytes) {
 return summarizeGLB(readGLB(bytes).document);
}

const componentArrays = {5121: Uint8Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array};
const elementWidths = {SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4};

export function readPackedAccessor({document, binary}, index) {
 const accessor = document.accessors?.[index];
 const view = document.bufferViews?.[accessor?.bufferView];
 const ArrayType = componentArrays[accessor?.componentType];
 const width = elementWidths[accessor?.type];
 if (!binary || !ArrayType || !width || accessor.sparse || view?.buffer !== 0 || view.extensions) return null;
 const stride = width * ArrayType.BYTES_PER_ELEMENT;
 if (view.byteStride && view.byteStride !== stride) return null;
 const offset = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
 const bytes = stride * accessor.count;
 const physicalOffset = binary.byteOffset + offset;
 if (!Number.isSafeInteger(bytes) || bytes < 0 || offset < 0 || offset + bytes > binary.length
   || (accessor.byteOffset ?? 0) + bytes > view.byteLength || physicalOffset % ArrayType.BYTES_PER_ELEMENT) return null;
 return new ArrayType(binary.buffer, physicalOffset, accessor.count * width);
}

export function writeGLB(document, binary) {
 const json = Buffer.from(JSON.stringify(document));
 const jsonLength = Math.ceil(json.length / 4) * 4;
 const binLength = Math.ceil(binary.length / 4) * 4;
 const bytes = Buffer.alloc(28 + jsonLength + binLength);
 bytes.writeUInt32LE(GLB_MAGIC, 0);
 bytes.writeUInt32LE(2, 4);
 bytes.writeUInt32LE(bytes.length, 8);
 bytes.writeUInt32LE(jsonLength, 12);
 bytes.writeUInt32LE(JSON_CHUNK, 16);
 json.copy(bytes, 20);
 bytes.fill(0x20, 20 + json.length, 20 + jsonLength);
 bytes.writeUInt32LE(binLength, 20 + jsonLength);
 bytes.writeUInt32LE(BIN_CHUNK, 24 + jsonLength);
 binary.copy(bytes, 28 + jsonLength);
 return bytes;
}
