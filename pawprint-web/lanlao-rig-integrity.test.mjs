import test from 'node:test';
import assert from 'node:assert/strict';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';

// Run from the project root: node --test lanlao-rig-integrity.test.mjs
// Override candidate only for temporary pre-integration review.
const basePath = process.env.LANLAO_BASE_MODEL || 'public/models/lanlao-base.glb';
const refinedPath = process.env.LANLAO_REFINED_MODEL || 'public/models/lanlao-rig-hip-refined.glb';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder': MeshoptDecoder});
const [original, refined] = await Promise.all([io.read(basePath), io.read(refinedPath)]);
const a = original.getRoot(), b = refined.getRoot();
const equalArray = (left, right, context) => {
 assert.ok(left && right, `${context}: missing array`);
 assert.equal(left.length, right.length, `${context}: length`);
 for (let i = 0; i < left.length; i++) assert.equal(left[i], right[i], `${context}: element ${i}`);
};
const accessor = (left, right, context) => {
 assert.equal(!!left, !!right, `${context}: accessor presence`);
 if (!left) return;
 assert.equal(left.getType(), right.getType(), `${context}: type`);
 assert.equal(left.getCount(), right.getCount(), `${context}: count`);
 assert.equal(left.getNormalized(), right.getNormalized(), `${context}: normalized`);
 equalArray(left.getArray(), right.getArray(), context);
};
const primitive = root => root.listMeshes()[0].listPrimitives()[0];

test('geometry, morphs and all non-WEIGHTS_0 attributes match', () => {
 assert.equal(a.listMeshes().length, b.listMeshes().length);
 a.listMeshes().forEach((mesh, mi) => {
  const other = b.listMeshes()[mi];
  assert.equal(mesh.getName(), other.getName());
  assert.deepEqual(mesh.getWeights(), other.getWeights());
  assert.equal(mesh.listPrimitives().length, other.listPrimitives().length);
  mesh.listPrimitives().forEach((p, pi) => {
   const q = other.listPrimitives()[pi], label = `mesh ${mi} primitive ${pi}`;
   assert.equal(p.getMode(), q.getMode());
   assert.deepEqual(p.listSemantics().sort(), q.listSemantics().sort());
   for (const key of p.listSemantics()) if (key !== 'WEIGHTS_0') accessor(p.getAttribute(key), q.getAttribute(key), `${label} ${key}`);
   accessor(p.getIndices(), q.getIndices(), `${label} indices`);
   assert.equal(p.listTargets().length, q.listTargets().length);
   p.listTargets().forEach((target, ti) => {
    const qt = q.listTargets()[ti];
    assert.deepEqual(target.listSemantics().sort(), qt.listSemantics().sort());
    for (const key of target.listSemantics()) accessor(target.getAttribute(key), qt.getAttribute(key), `${label} morph ${ti} ${key}`);
   });
  });
 });
});

test('skeleton, bind matrices, node transforms and hierarchy match', () => {
 assert.equal(a.listNodes().length, b.listNodes().length);
 const an = a.listNodes(), bn = b.listNodes();
 an.forEach((node,i) => {
  const other=bn[i]; assert.equal(node.getName(),other.getName());
  for(const method of ['getTranslation','getRotation','getScale','getWeights']) assert.deepEqual(node[method](),other[method](),`node ${i} ${method}`);
  assert.deepEqual(node.listChildren().map(x=>an.indexOf(x)),other.listChildren().map(x=>bn.indexOf(x)),`node ${i} children`);
 });
 assert.equal(a.listSkins().length,b.listSkins().length);
 a.listSkins().forEach((skin,i)=>{
  const other=b.listSkins()[i];
  assert.deepEqual(skin.listJoints().map(x=>an.indexOf(x)),other.listJoints().map(x=>bn.indexOf(x)));
  assert.equal(an.indexOf(skin.getSkeleton()),bn.indexOf(other.getSkeleton()));
  accessor(skin.getInverseBindMatrices(),other.getInverseBindMatrices(),`skin ${i} bind matrices`);
 });
});

test('all animation channels, timing and keyframes match', () => {
 const an=a.listNodes(), bn=b.listNodes(), aa=a.listAnimations(), ba=b.listAnimations();
 assert.equal(aa.length,ba.length);
 aa.forEach((anim,i)=>{
  const other=ba[i]; assert.equal(anim.getName(),other.getName());
  const channels=anim.listChannels(), oc=other.listChannels(); assert.equal(channels.length,oc.length);
  channels.forEach((ch,j)=>{
   const oh=oc[j]; assert.equal(ch.getTargetPath(),oh.getTargetPath());
   assert.equal(an.indexOf(ch.getTargetNode()),bn.indexOf(oh.getTargetNode()));
   const s=ch.getSampler(), t=oh.getSampler(); assert.equal(s.getInterpolation(),t.getInterpolation());
   accessor(s.getInput(),t.getInput(),`animation ${i} channel ${j} input`);
   accessor(s.getOutput(),t.getOutput(),`animation ${i} channel ${j} output`);
  });
 });
});

test('embedded texture images and material assignments match', () => {
 const textures=root=>new Map(root.listTextures().map(t=>[t.getName(),t]));
 const at=textures(a), bt=textures(b); assert.equal(at.size,bt.size);
 for(const [name,t] of at){const u=bt.get(name);assert.ok(u,`missing texture ${name}`);assert.equal(t.getMimeType(),u.getMimeType());equalArray(t.getImage(),u.getImage(),`texture ${name}`);}
 const am=a.listMaterials(), bm=b.listMaterials();assert.equal(am.length,bm.length);
 const textureMethods=['getBaseColorTexture','getNormalTexture','getMetallicRoughnessTexture','getOcclusionTexture','getEmissiveTexture'];
 const propertyMethods=['getBaseColorFactor','getMetallicFactor','getRoughnessFactor','getEmissiveFactor','getAlphaMode','getAlphaCutoff','getDoubleSided','getNormalScale','getOcclusionStrength'];
 am.forEach((m,i)=>{const n=bm[i];assert.equal(m.getName(),n.getName());for(const method of propertyMethods) assert.deepEqual(m[method](),n[method](),`material ${i} ${method}`);for(const method of textureMethods) assert.equal(m[method]()?.getName(),n[method]()?.getName(),`material ${i} ${method}`);});
});

test('weights are finite, nonnegative, normalized, and preserve UV seam changes', () => {
 const p=primitive(a), q=primitive(b), pos=p.getAttribute('POSITION'), count=pos.getCount();
 const skins=b.listSkins();assert.equal(skins.length,1);const jointCount=skins[0].listJoints().length;
 const seen=new Map();let changed=0, seamPairs=0;
 for(let i=0;i<count;i++){
  let total=0;const deltas=new Map();
  for(let set=0;set<2;set++){
   const weights=q.getAttribute(`WEIGHTS_${set}`), joints=q.getAttribute(`JOINTS_${set}`);
   if(!weights){assert.equal(joints,null);continue;}
   const w=weights.getElement(i,[]), j=joints.getElement(i,[]), before=p.getAttribute(`WEIGHTS_${set}`).getElement(i,[]);
   for(let k=0;k<w.length;k++){
    assert.ok(Number.isFinite(w[k]) && w[k]>=0,`vertex ${i}: invalid weight`);
    assert.ok(Number.isInteger(j[k]) && j[k]>=0 && j[k]<jointCount,`vertex ${i}: invalid joint`);
    total+=w[k]; const delta=w[k]-before[k];if(Math.abs(delta)>1e-7)changed++;
    deltas.set(j[k],(deltas.get(j[k])||0)+delta);
   }
  }
  assert.ok(Math.abs(total-1)<1e-5,`vertex ${i}: weights sum to ${total}`);
  const key=pos.getElement(i,[]).join(',');
  if(seen.has(key)){
   seamPairs++;const previous=seen.get(key);
   for(const joint of new Set([...previous.keys(),...deltas.keys()])) assert.ok(Math.abs((previous.get(joint)||0)-(deltas.get(joint)||0))<1e-6,`vertex ${i}: seam delta differs for joint ${joint}`);
  } else seen.set(key,deltas);
 }
 assert.ok(changed>0,'candidate does not change weights');
 assert.ok(seamPairs>0,'expected duplicate-position seam vertices');
});

test('GLB bytes differ only in the original WEIGHTS_0 accessor', async () => {
 const {readFile}=await import('node:fs/promises');
 const [oldFile,newFile]=await Promise.all([readFile(basePath),readFile(refinedPath)]);
 assert.equal(oldFile.length,newFile.length,'GLB byte length changed');
 assert.equal(oldFile.toString('ascii',0,4),'glTF');
 const jsonLength=oldFile.readUInt32LE(12);
 assert.equal(oldFile.toString('ascii',16,20),'JSON');
 const metadata=JSON.parse(oldFile.toString('utf8',20,20+jsonLength));
 const binHeader=20+jsonLength;
 assert.equal(oldFile.toString('ascii',binHeader+4,binHeader+8),'BIN\u0000');
 const weightIndex=metadata.meshes[0].primitives[0].attributes.WEIGHTS_0;
 const weight=metadata.accessors[weightIndex], view=metadata.bufferViews[weight.bufferView];
 assert.equal(weight.type,'VEC4');assert.equal(weight.componentType,5126);assert.equal(view.buffer,0);
 assert.ok(!weight.sparse,'sparse weights require a different verification');
 const start=binHeader+8+(view.byteOffset||0)+(weight.byteOffset||0), stride=view.byteStride||16;
 let changedBytes=0;
 for(let i=0;i<oldFile.length;i++){
  if(oldFile[i]===newFile[i])continue;
  const offset=i-start, inWeight=offset>=0 && Math.floor(offset/stride)<weight.count && offset%stride<16;
  assert.ok(inWeight,`unexpected GLB byte change at offset ${i}`);changedBytes++;
 }
 assert.ok(changedBytes>0,'GLB contains no weight changes');
});
