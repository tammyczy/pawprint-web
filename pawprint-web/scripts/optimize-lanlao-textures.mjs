// Re-encode Lanlao's textures as WebP for the website copy of the model.
// Geometry, skin weights, morph targets and animations are written unchanged,
// so the motion code and its tests keep using identical vertex data.
// Usage: node scripts/optimize-lanlao-textures.mjs
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS,EXTTextureWebP} from '@gltf-transform/extensions';
import sharp from 'sharp';
import {statSync} from 'node:fs';

const source='public/models/lanlao-rig-motion-refined.glb',target='public/models/lanlao-web.glb';
const quality={basecolor:82,normal:92,rm:90};
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
const summary=doc=>{const root=doc.getRoot();let vertices=0;for(const mesh of root.listMeshes())for(const primitive of mesh.listPrimitives())vertices+=primitive.getAttribute('POSITION').getCount();return JSON.stringify({vertices,joints:root.listSkins().map(skin=>skin.listJoints().length),animations:root.listAnimations().map(animation=>animation.getName()),targets:root.listMeshes().map(mesh=>mesh.listPrimitives()[0].listTargets().length)});};

const doc=await io.read(source),before=summary(doc);
doc.createExtension(EXTTextureWebP).setRequired(true);
for(const texture of doc.getRoot().listTextures()){
 const kind=Object.keys(quality).find(key=>texture.getName().endsWith(key));
 if(!kind)throw new Error(`Unexpected texture: ${texture.getName()}`);
 const [width,height]=texture.getSize(),bytes=texture.getImage().byteLength;
 const webp=await sharp(texture.getImage()).webp({quality:quality[kind],effort:6,smartSubsample:true}).toBuffer();
 // An already-compressed JPEG can come out larger; keep the original then.
 if(webp.byteLength>=bytes*.9){console.log(`${kind}: ${width}×${height}, kept original (${bytes} bytes)`);continue;}
 texture.setImage(webp).setMimeType('image/webp');
 console.log(`${kind}: ${width}×${height}, ${bytes} → ${webp.byteLength} bytes`);
}
await io.write(target,doc);
const after=summary(await io.read(target));
if(before!==after)throw new Error(`Model structure changed:\n${before}\n${after}`);
console.log(`${source} ${statSync(source).size} → ${target} ${statSync(target).size} bytes; structure unchanged: ${after}`);
