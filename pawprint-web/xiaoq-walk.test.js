import test from 'node:test';
import assert from 'node:assert/strict';
import {footCycle,repairXiaoqWalk} from './src/xiaoq-walk.js';
import * as THREE from 'three';
test('runtime rebind preserves original geometry and keeps upper body stationary',()=>{
 const root=new THREE.Group(),geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute([-.137,.02,-.184,.056,.02,-.158,-.165,.02,.242,.023,.02,.278,0,.6,0],3));
 const mesh=new THREE.SkinnedMesh(geometry,new THREE.MeshBasicMaterial());root.add(mesh);
 const walk=repairXiaoqWalk(root);assert.notEqual(mesh.geometry,geometry);assert.equal(geometry.attributes.skinWeight,undefined);
 const w=mesh.geometry.attributes.skinWeight;
 for(let i=0;i<w.count;i++)assert.ok(Math.abs(w.getX(i)+w.getY(i)+w.getZ(i)+w.getW(i)-1)<1e-6);
 for(let frame=0;frame<120;frame++){walk.update(1/60,true);root.updateMatrixWorld(true);mesh.skeleton.update();const vertex=new THREE.Vector3();mesh.getVertexPosition(4,vertex);assert.ok(vertex.distanceTo(new THREE.Vector3(0,.6,0))<1e-6);}
 for(let frame=0;frame<180;frame++)walk.update(1/60,false);
 for(const bone of mesh.skeleton.bones)assert.ok(bone.quaternion.angleTo(new THREE.Quaternion())<.001);
 walk.start('wag');for(let i=0;i<20;i++)walk.update(1/60,'wag');
 assert.ok(Math.abs(mesh.skeleton.bones[10].rotation.y)>.02);
 walk.start('jump');let peak=0,finished=false;
 for(let i=0;i<80;i++){finished=walk.update(1/60,'jump').finished;peak=Math.max(peak,mesh.skeleton.bones[0].position.y);}
 assert.ok(peak>.1);assert.equal(finished,true);
 for(const action of ['run','stop','jump','stop','wag','stop']){
  walk.start(action);for(let i=0;i<120;i++)walk.update(1/60,action);
  for(const bone of mesh.skeleton.bones)assert.ok([...bone.position,...bone.quaternion].every(Number.isFinite));
 }
 assert.ok(Math.abs(mesh.skeleton.bones[0].position.y)<.001);
});
test('walk has grounded stance, positive swing clearance and continuous loop',()=>{
 for(let i=0;i<68;i++)assert.equal(footCycle(i/100).y,0);
 for(let i=0;i<1000;i++){const p=footCycle(i/1000);assert.ok(p.y>=0&&p.y<=.024);assert.ok(Math.abs(p.z)<=.03250001);}
 for(const boundary of [0,.68,1]){const a=footCycle(boundary-1e-7),b=footCycle(boundary+1e-7);assert.ok(Math.abs(a.z-b.z)<1e-6);assert.ok(Math.abs(a.y-b.y)<1e-6);}
});
