import test from 'node:test';
import assert from 'node:assert/strict';
import {AnimationClip, Bone, Group, Mesh, BoxGeometry, MeshBasicMaterial, Quaternion, QuaternionKeyframeTrack, Vector3, VectorKeyframeTrack} from 'three';
import {createLanlaoJaw} from './lanlao-jaw-draft.js';

function fixture(random=()=>0) {
 const model=new Group(),head=new Bone(),jaw=new Bone(),tongue=new Mesh(new BoxGeometry(),new MeshBasicMaterial());
 head.name='Head';jaw.name='Lower_Jaw';tongue.name='Tongue';model.add(head);head.add(jaw);jaw.add(tongue);
 const open=new Quaternion().setFromAxisAngle(new Vector3(0,0,1),.3);
 const clip=new AnimationClip('Lanlao_Jaw_Smile',1,[new QuaternionKeyframeTrack('Lower_Jaw.quaternion',[0,1],[0,0,0,1,open.x,open.y,open.z,open.w]),new VectorKeyframeTrack('Tongue.scale',[0,1],[0,0,0,1,1,1])]);
 return {model,head,jaw,tongue,smile:createLanlaoJaw(model,clip,{random})};
}
test('jaw expression follows interaction, layers on existing movement and restores its base pose',()=>{
 const {model,head,jaw,tongue,smile}=fixture(); assert.equal(smile.enabled,true); assert.equal(smile.trigger(),true); assert.equal(smile.trigger(),false);
 head.rotation.y=.2;const original=jaw.quaternion.clone();
 for(let i=0;i<10;i++){smile.apply(.05);if(i===9){assert.ok(jaw.quaternion.angleTo(original)>.2);assert.ok(tongue.scale.x>.9);assert.equal(tongue.parent,jaw);assert.equal(jaw.parent,head);}smile.restore();}
 assert.ok(jaw.quaternion.angleTo(original)<1e-7);assert.equal(head.rotation.y,.2);assert.equal(tongue.scale.x,1);
 for(let i=0;i<70;i++){smile.apply(.05);smile.restore();}
 assert.ok(jaw.quaternion.angleTo(original)<1e-7);assert.equal(smile.trigger(),false);
});
test('reduced motion stops the expression and missing jaw cannot trigger it',()=>{
 const {smile,jaw}=fixture();smile.trigger();smile.apply(.1);smile.restore();smile.apply(.1,{reduced:true});assert.ok(jaw.quaternion.angleTo(new Quaternion())<1e-7);
 assert.equal(createLanlaoJaw(new Group(),null).trigger(),false);
});
test('unrelated animation tracks never modify the body',()=>{
 const {model,head,smile:old}=fixture();const before=head.quaternion.clone();
 const clip=new AnimationClip('Lanlao_Jaw_Smile',1,[new QuaternionKeyframeTrack('Head.quaternion',[0,1],[0,0,0,1,0,0,1,0]),new QuaternionKeyframeTrack('Lower_Jaw.quaternion',[0,1],[0,0,0,1,0,0,.1,.995])]);
 const smile=createLanlaoJaw(model,clip,{random:()=>0});smile.trigger();smile.apply(.1);assert.ok(head.quaternion.angleTo(before)<1e-7);smile.restore();
});
