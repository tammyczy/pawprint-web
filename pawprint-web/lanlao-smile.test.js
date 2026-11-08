import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {softenLanlaoEarColor} from './src/lanlao-ear-color.js';
import {createLanlaoSmile} from './src/lanlao-smile.js';

test('smile blends with existing shaders and closes after an interaction', () => {
 const model=new THREE.Group();
 const material=new THREE.MeshStandardMaterial();
 material.onBeforeCompile=shader=>{shader.fragmentShader+='\n// eyelid shader';};
 material.customProgramCacheKey=()=> 'eyelid';
 model.add(new THREE.SkinnedMesh(new THREE.BoxGeometry(),material));
 softenLanlaoEarColor(model);
 const smile=createLanlaoSmile(model,{random:()=>0});
 const shader={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <map_fragment>'};
 material.onBeforeCompile(shader,null);
 assert.match(shader.fragmentShader,/eyelid shader/);
 assert.match(shader.fragmentShader,/lanlaoCoatPosition/);
 assert.match(shader.fragmentShader,/smilePosition/);
 assert.equal(smile.trigger(),true);
 assert.equal(smile.trigger(),false);
 smile.update(.4);
 assert.ok(shader.uniforms.lanlaoSmile.value>.9);
 smile.update(3);
 assert.equal(shader.uniforms.lanlaoSmile.value,0);
 assert.equal(smile.trigger(),true);
 smile.update(.4,{reduced:true});
 assert.equal(shader.uniforms.lanlaoSmile.value,0);
});

test('smiles remain occasional when the random draw misses', () => {
 const smile=createLanlaoSmile(new THREE.Group(),{random:()=>.9});
 assert.equal(smile.trigger(),false);
});

test('tongue follows the head and hides when the smile ends', () => {
 const model=new THREE.Group();
 const head=new THREE.Bone();
 head.name='Head';
 head.position.set(-.2,.7,.03);
 model.add(head);
 const smile=createLanlaoSmile(model,{random:()=>0});
 const tongue=head.getObjectByProperty('type','Mesh');
 assert.ok(tongue);
 assert.equal(tongue.visible,false);
 smile.trigger();
 smile.update(.5);
 assert.equal(tongue.visible,true);
 assert.ok(tongue.scale.y>0 && tongue.scale.y<=.012);
 smile.update(3);
 assert.equal(tongue.visible,false);
 smile.trigger();
 smile.update(.5);
 smile.update(.01,{visible:false});
 assert.equal(tongue.visible,false);
});
