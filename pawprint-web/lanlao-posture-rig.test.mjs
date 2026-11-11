import test from 'node:test';
import assert from 'node:assert/strict';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
import {Bone, Group, Matrix4, Vector3, Quaternion} from 'three';
import {createLanlaoPosture} from './src/lanlao-posture.js';
import {lanlaoJumpDuration} from './src/lanlao-jump.js';
import {createLanlaoStepTurn} from './src/lanlao-route.js';

// Exercise the runtime posture code against the same skinned model used by the viewer.
// Three.js renders JOINTS_0/WEIGHTS_0, normalized to four influences.
await MeshoptDecoder.ready;
const file=process.env.LANLAO_RIG_MODEL || 'public/models/lanlao-rig-motion-refined.glb';
const doc=await new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder}).read(file);
const skin=doc.getRoot().listSkins()[0], joints=skin.listJoints();
const primitive=doc.getRoot().listMeshes()[0].listPrimitives()[0];
const position=primitive.getAttribute('POSITION'), weights=primitive.getAttribute('WEIGHTS_0'), ids=primitive.getAttribute('JOINTS_0');
const indices=primitive.getIndices().getArray();
const inverse=joints.map((_,i)=>new Matrix4().fromArray(skin.getInverseBindMatrices().getElement(i,[])));
const model=new Group();
const bones=new Map(joints.map(node=>{
 const bone=new Bone();bone.name=node.getName();bone.position.fromArray(node.getTranslation());
 bone.quaternion.fromArray(node.getRotation());bone.scale.fromArray(node.getScale());return [node,bone];
}));
for(const [node,bone] of bones) for(const child of node.listChildren()) if(bones.has(child)) bone.add(bones.get(child));
model.add(bones.get(skin.getSkeleton()??joints[0]));model.updateMatrixWorld(true);
const posture=createLanlaoPosture(model);
const vertices=Array.from({length:position.getCount()},(_,i)=>{
 const ws=weights.getElement(i,[]), sum=ws.reduce((a,b)=>a+b,0);
 return {p:new Vector3().fromArray(position.getElement(i,[])),ids:ids.getElement(i,[]),ws:ws.map(w=>sum?w/sum:0)};
});
function deformed(){
 model.updateWorldMatrix(true,true);
 const toModel=model.matrixWorld.clone().invert();
 const matrices=joints.map((node,i)=>new Matrix4().multiplyMatrices(toModel,bones.get(node).matrixWorld).multiply(inverse[i]));
 const result=new Float32Array(vertices.length*3), v=new Vector3(),p=new Vector3();
 vertices.forEach((o,i)=>{p.set(0,0,0);for(let j=0;j<4;j++)if(o.ws[j])p.addScaledVector(v.copy(o.p).applyMatrix4(matrices[o.ids[j]]),o.ws[j]);p.toArray(result,i*3)});
 return result;
}
function edgeLength(array,a,b){return Math.hypot(array[a*3]-array[b*3],array[a*3+1]-array[b*3+1],array[a*3+2]-array[b*3+2]);}
const rest=deformed(),edges=[];
for(let i=0;i<indices.length;i+=3)for(let k=0;k<3;k++){
 const a=indices[i+k],b=indices[i+(k+1)%3], length=edgeLength(rest,a,b);
 if(length>=.001)edges.push({a,b,length});
}
function metrics(current){
 let maxStretch=0,stretched=0,minY=Infinity;
 for(let i=1;i<current.length;i+=3)minY=Math.min(minY,current[i]);
 for(const e of edges){const stretch=edgeLength(current,e.a,e.b)/e.length;maxStretch=Math.max(maxStretch,stretch);if(stretch>2)stretched++;}
 return {maxStretch,stretched,minY};
}
const initial=Array.from(bones.values()).map(b=>({p:b.position.clone(),q:b.quaternion.clone(),s:b.scale.clone()}));
test('step turns reposition lifted paws while grounded paws hold their world contacts',()=>{
 const paws=['Front_L_Paw','Front_R_Paw','Hind_L_Paw','Hind_R_Paw'].map(name=>model.getObjectByName(name));
 const heights=paws.map(b=>b.getWorldPosition(new Vector3()).y);
 for(const angle of [-Math.PI,.9,Math.PI]){
  model.quaternion.identity();
  const turn=createLanlaoStepTurn(0,angle);
  let previous=null,done=false;
  for(let i=0;i<240&&!done;i++){
   const beat=turn.advance(1/60);done=beat.done;
   model.quaternion.setFromAxisAngle(new Vector3(0,1,0),beat.yaw);
   posture.applyGreetingTurn(beat.progress,beat.angle);
   const points=paws.map(b=>b.getWorldPosition(new Vector3()));
   points.forEach((p,j)=>{
    assert(p.y>=heights[j]-.002,'turn paw penetrated ground');
    if(previous){
     assert(p.distanceTo(previous[j])<.03,'turn paw jumped');
     if(p.y<heights[j]+.001&&previous[j].y<heights[j]+.001)
      assert(p.distanceTo(previous[j])<.003,'grounded turn paw slid');
    }
   });
   previous=points;
   posture.restore();
  }
  assert(done);
 }
 model.quaternion.identity();
});
test('small jump keeps support paws grounded and returns the real rig to its bind pose',()=>{
 const paws=['Front_L_Paw','Front_R_Paw','Hind_L_Paw','Hind_R_Paw'].map(name=>model.getObjectByName(name));
 const base=paws.map(b=>b.getWorldPosition(new Vector3()));
 let previous=null;
 for(let i=0;i<=Math.ceil(lanlaoJumpDuration*120);i++){
  const time=i/120;
  posture.applyJump(time);
  const points=paws.map(b=>b.getWorldPosition(new Vector3()));
  if(previous)points.forEach((p,j)=>assert(p.distanceTo(previous[j])<.025,'jump paw snapped'));
  points.forEach((p,j)=>{
   assert(p.y>=base[j].y-.002,'jump foot penetrated ground');
   const support=j<2?(time<=.14||time>=.58):(time<=.34||time>=.64);
   if(support)assert(p.distanceTo(base[j])<.002,'support paw moved before takeoff / after landing');
  });
  previous=points;
  if(i%4===0)assert(metrics(deformed()).minY>=-.003,'jump mesh penetrated ground');
  posture.restore();
 }
 Array.from(bones.values()).forEach((bone,i)=>{
  assert(bone.position.distanceTo(initial[i].p)<1e-7);
  assert(bone.quaternion.equals(initial[i].q));
 });
});
test('sit, lie and stand transitions retain ground contact and limit local stretching',()=>{
 let lastPositions=null;
 for(const [target,maxStretch,maxEdges] of [['sit',2.95,350],['lie',3.85,620],['stand',3.85,620]]){
  posture.set(target);
  let worst=0,most=0,lowest=Infinity,maxStep=0;
  for(let frame=0;frame<150;frame++){
   posture.apply(1/60);model.updateMatrixWorld(true);
   const points=Array.from(bones.values()).map(b=>b.getWorldPosition(new Vector3()));
   if(lastPositions)points.forEach((p,i)=>maxStep=Math.max(maxStep,p.distanceTo(lastPositions[i])));
   lastPositions=points;
   // Every other frame plus the final frame covers the full motion and its settled pose.
   if(frame%2===0 || frame===149){const m=metrics(deformed());worst=Math.max(worst,m.maxStretch);most=Math.max(most,m.stretched);lowest=Math.min(lowest,m.minY);}
   posture.restore();
  }
  assert.equal(posture.current,target,`${target} did not settle`);
  assert.ok(posture.ready,`${target} did not become ready`);
  assert.ok(worst<maxStretch,`${target}: edge stretch ${worst}`);
  assert.ok(most<=maxEdges,`${target}: ${most} edges stretched over 2x`);
  assert.ok(lowest>=-.003,`${target}: mesh penetrated ground at ${lowest}`);
  assert.ok(maxStep<.025,`${target}: bone moved ${maxStep} in one frame`);
 }
 model.updateMatrixWorld(true);
 Array.from(bones.values()).forEach((bone,i)=>{
  assert.ok(bone.position.distanceTo(initial[i].p)<1e-7,`${bone.name} did not restore position`);
  assert.ok(Math.abs(bone.quaternion.x-initial[i].q.x)<1e-7 && Math.abs(bone.quaternion.y-initial[i].q.y)<1e-7 && Math.abs(bone.quaternion.z-initial[i].q.z)<1e-7 && Math.abs(bone.quaternion.w-initial[i].q.w)<1e-7,`${bone.name} did not restore orientation`);
  assert.ok(bone.scale.distanceTo(initial[i].s)<1e-7,`${bone.name} did not restore scale`);
 });
});
