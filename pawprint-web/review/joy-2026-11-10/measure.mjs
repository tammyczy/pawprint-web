import {AnimationClip,AnimationMixer,QuaternionKeyframeTrack,VectorKeyframeTrack,Vector3} from 'three';
import {loadLanlaoRig} from '../../test-support/lanlao-rig.mjs';
import {createLanlaoPosture as beforePosture} from './before/lanlao-posture.js';
import {createLanlaoPosture as afterPosture} from '../../src/lanlao-posture.js';

const results={};
for(const [label,makePosture] of [['before',beforePosture],['after',afterPosture]]){
 const {doc,model,paws}=await loadLanlaoRig(),posture=makePosture(model);
 const animation=doc.getRoot().listAnimations().find(a=>a.getName()==='Tail_Wag_Natural');
 const tracks=[];
 for(const channel of animation.listChannels()){
  const bone=model.getObjectByName(channel.getTargetNode().getName()),kind=channel.getTargetPath();
  const property={rotation:'quaternion',translation:'position',scale:'scale'}[kind];
  if(!bone||!property)continue;
  const sampler=channel.getSampler(),Track=kind==='rotation'?QuaternionKeyframeTrack:VectorKeyframeTrack;
  tracks.push(new Track(`${bone.uuid}.${property}`,sampler.getInput().getArray(),sampler.getOutput().getArray()));
 }
 const mixer=new AnimationMixer(model);mixer.clipAction(new AnimationClip('wag',-1,tracks)).play();
 const tail=model.getObjectByName('Tail_Base'),pelvis=model.getObjectByName('Pelvis');
 const tailRest=tail.quaternion.clone(),hipRest=pelvis.getWorldPosition(new Vector3());
 const feet=paws.map(p=>p.getWorldPosition(new Vector3()));let tailAngle=0,hipSide=0,pawHorizontal=0,pawVertical=0;
 for(let frame=0;frame<=480;frame++){
  mixer.setTime(frame/120);posture.applyTailWag();
  tailAngle=Math.max(tailAngle,tail.quaternion.angleTo(tailRest));
  hipSide=Math.max(hipSide,Math.abs(pelvis.getWorldPosition(new Vector3()).z-hipRest.z));
  paws.forEach((p,i)=>{const q=p.getWorldPosition(new Vector3());pawHorizontal=Math.max(pawHorizontal,Math.hypot(q.x-feet[i].x,q.z-feet[i].z));pawVertical=Math.max(pawVertical,Math.abs(q.y-feet[i].y));});
  posture.restore();
 }
 results[label]={maximumTailRotationDegrees:tailAngle*180/Math.PI,maximumHipSideShift:hipSide,maximumPawHorizontalDrift:pawHorizontal,maximumPawVerticalDrift:pawVertical};
}
console.log(JSON.stringify(results,null,2));
