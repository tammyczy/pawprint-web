import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createWebFur} from './src/web-fur.js';
import {createStrandFur} from './src/strand-fur.js';
test('colored strands preserve source assets and carry normalized skeletal weights',()=>{
 const root=new THREE.Group(),g=new THREE.BoxGeometry(),map=new THREE.Texture(),material=new THREE.MeshStandardMaterial({map});
 const joints=new Uint16Array(g.attributes.position.count*4),weights=new Float32Array(joints.length);for(let i=0;i<weights.length;i+=4)weights[i]=1;
 g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(joints,4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
 const source=new THREE.SkinnedMesh(g,material),bone=new THREE.Bone();source.add(bone);source.bind(new THREE.Skeleton([bone]));root.add(source);
 const fur=createStrandFur(root,{count:100});assert.equal(fur.count,1);const hair=root.children[1];
 assert.equal(hair.material.map,map);assert.equal(hair.skeleton,source.skeleton);assert.equal(source.geometry,g);assert.equal(source.material,material);
 const w=hair.geometry.attributes.skinWeight;assert.ok(w.count>0);for(let i=0;i<w.count;i++)assert.ok(Math.abs(w.getX(i)+w.getY(i)+w.getZ(i)+w.getW(i)-1)<1e-5);
 assert.ok([...hair.geometry.attributes.position.array].every(Number.isFinite));fur.setEnabled(false);assert.equal(hair.visible,false);fur.update(.016,'walk');fur.dispose();assert.equal(root.children.length,1);
});
test('runtime fur preserves source texture, skeleton and geometry; toggle and cleanup work',()=>{
 const root=new THREE.Group(),geometry=new THREE.BoxGeometry(),texture=new THREE.Texture();
 const material=new THREE.MeshStandardMaterial({map:texture});const mesh=new THREE.SkinnedMesh(geometry,material);const bone=new THREE.Bone();mesh.add(bone);mesh.bind(new THREE.Skeleton([bone]));root.add(mesh);
 const fur=createWebFur(root,{layers:6});assert.equal(fur.count,6);assert.equal(root.children.length,7);
 for(const shell of root.children.slice(1)){assert.equal(shell.material.map,texture);assert.equal(shell.skeleton,mesh.skeleton);assert.equal(shell.geometry,geometry);assert.notEqual(shell.material,material);}
 fur.setEnabled(false);assert.ok(root.children.slice(1).every(x=>!x.visible));assert.equal(mesh.visible,true);
 fur.setEnabled(true);fur.update(.016,'run');fur.setLength(.02);fur.dispose();assert.equal(root.children.length,1);assert.equal(mesh.material,material);
});


test('fur shells follow the source mesh morph animation',()=>{
 const root=new THREE.Group(),geometry=new THREE.BoxGeometry();
 geometry.morphAttributes.position=[geometry.attributes.position.clone()];
 geometry.morphAttributes.position[0].name='Coat_Sway';
 const material=new THREE.MeshStandardMaterial({map:new THREE.Texture()});
 const source=new THREE.SkinnedMesh(geometry,material),bone=new THREE.Bone();
 source.add(bone);source.bind(new THREE.Skeleton([bone]));root.add(source);
 const fur=createWebFur(root,{layers:3});
 source.morphTargetInfluences[0]=.7;
 for(const shell of root.children.slice(1)){
  assert.equal(shell.morphTargetInfluences,source.morphTargetInfluences);
  assert.equal(shell.morphTargetInfluences[0],.7);
 }
 source.morphTargetInfluences[0]=-.2;
 assert.equal(root.children[1].morphTargetInfluences[0],-.2);
 fur.dispose();
});
