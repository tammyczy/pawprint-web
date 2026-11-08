import test from 'node:test';
import assert from 'node:assert/strict';
import {Bone, Group, Vector3} from 'three';
import {createLanlaoExpression} from './src/lanlao-expression.js';

test('petting animates the tail and restores the existing pose', () => {
 const model=new Group();
 for(const name of ['Head','Ear_L','Ear_R','Tail_Base','Tail_Tip']){
  const bone=new Bone();
  bone.name=name;
  model.add(bone);
 }
 model.updateMatrixWorld(true);
 const tail=model.getObjectByName('Tail_Base');
 const rest=tail.quaternion.clone();
 const expression=createLanlaoExpression(model);
 let peak=0;
 for(let i=0;i<40;i++){
  expression.apply(1/60,{mode:'stop',visible:true,reduced:false,body:model,camera:new Vector3(-2,1,2),petting:true});
  peak=Math.max(peak,tail.quaternion.angleTo(rest));
  expression.restore();
  assert.ok(tail.quaternion.angleTo(rest)<1e-7);
 }
 assert.ok(peak>.05);
 expression.apply(1/60,{mode:'stop',visible:true,reduced:true,body:model,camera:new Vector3(-2,1,2),petting:true});
 assert.ok(tail.quaternion.angleTo(rest)<1e-7);
});

test('petting moves torso without sliding paws and restores the pose', async () => {
 const {createLanlaoPetting}=await import('./src/lanlao-petting.js');
 const model=new Group();
 model.position.set(.2,.1,-.4);
 model.rotation.y=.7;
 model.scale.setScalar(1.3);
 const body=new Bone();body.name='Body';body.position.set(0,.4,0);model.add(body);
 const chest=new Bone();chest.name='Chest';chest.position.set(-.15,.1,0);body.add(chest);
 const pelvis=new Bone();pelvis.name='Pelvis';pelvis.position.set(.15,0,0);body.add(pelvis);
 const paws=[];
 for(const [parent,name,z] of [[chest,'Front_L_Upper',.12],[chest,'Front_R_Upper',-.12],[pelvis,'Hind_L_Upper',.12],[pelvis,'Hind_R_Upper',-.12]]){
  const leg=new Bone();leg.name=name;leg.position.set(0,0,z);parent.add(leg);
  const paw=new Bone();paw.position.set(0,-.4,0);leg.add(paw);paws.push(paw);
 }
 model.updateMatrixWorld(true);
 const before=paws.map(paw=>paw.getWorldPosition(new Vector3()));
 const chestBefore=chest.getWorldPosition(new Vector3());
 const positions=[body,chest,pelvis,...chest.children].map(bone=>bone.position.clone());
 const motion=createLanlaoPetting(model);
 for(let i=0;i<60;i++){
  motion.apply(1/60,{active:true,available:true,side:1});
  model.updateMatrixWorld(true);
  paws.forEach((paw,index)=>assert.ok(paw.getWorldPosition(new Vector3()).distanceTo(before[index])<1e-6));
  if(i===59)assert.ok(chest.getWorldPosition(new Vector3()).distanceTo(chestBefore)>.002);
  motion.restore();
  model.updateMatrixWorld(true);
 }
 [body,chest,pelvis,...chest.children].forEach((bone,index)=>assert.ok(bone.position.distanceTo(positions[index])<1e-9));
});

test('wag uses the authored tail and head motion without an extra expression', () => {
 const model=new Group();
 for(const name of ['Head','Ear_L','Ear_R','Tail_Base','Tail_Tip']){
  const bone=new Bone();
  bone.name=name;
  model.add(bone);
 }
 model.updateMatrixWorld(true);
 const expression=createLanlaoExpression(model);
 const tail=model.getObjectByName('Tail_Base');
 const head=model.getObjectByName('Head');
 tail.rotation.y=.2;
 head.rotation.z=.1;
 const originalTail=tail.quaternion.clone();
 const originalHead=head.quaternion.clone();
 expression.apply(1/60,{mode:'wag',visible:true,reduced:false,body:model,camera:new Vector3(-2,1,2)});
 assert.ok(tail.quaternion.angleTo(originalTail)<1e-7);
 assert.ok(head.quaternion.angleTo(originalHead)<1e-7);
 expression.restore();
 assert.ok(tail.quaternion.angleTo(originalTail)<1e-7);
});
