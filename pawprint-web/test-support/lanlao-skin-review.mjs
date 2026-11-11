import {Vector3} from 'three';
import {loadLanlaoRig} from './lanlao-rig.mjs';
import {createLanlaoPosture} from '../src/lanlao-posture.js';
import {createLanlaoStride} from '../src/lanlao-stride.js';
export async function compareLanlaoSkinMotion(candidate='public/models/lanlao-rig-motion-refined.glb'){
const base=await loadLanlaoRig('public/models/lanlao-rig-hip-refined.glb');
const refined=await loadLanlaoRig(candidate);
const posture=createLanlaoPosture(base.model),stride=createLanlaoStride(base.model,base.actor,posture);
const rest=base.deformed(),indices=base.indices,edges=[];
const distance=(a,i,j)=>Math.hypot(a[i*3]-a[j*3],a[i*3+1]-a[j*3+1],a[i*3+2]-a[j*3+2]);
for(let i=0;i<indices.length;i+=3)for(let k=0;k<3;k++){const a=indices[i+k],b=indices[i+(k+1)%3],d=distance(rest,a,b);if(d>.001)edges.push({a,b,d});}
function score(rig){const shape=rig.deformed();let maximum=0,over2=0,excess=0;for(const e of edges){const ratio=distance(shape,e.a,e.b)/e.d;maximum=Math.max(maximum,ratio);if(ratio>2){over2++;excess+=(ratio-2)**2;}}return {maximum,over2,excess};}
const results={};
for(const mode of ['gallop','turn','transition','brake','sit','lie']){
 base.actor.position.set(0,0,0);base.actor.quaternion.identity();posture.reset();stride.start();
 if(mode==='sit'||mode==='lie'){stride.stop();posture.set(mode);}
 let speed=0,yaw=0;
 const result={before:{maximum:0,over2:0,excess:0},after:{maximum:0,over2:0,excess:0}};
 for(let f=0;f<420;f++){
  const t=f/60,target=mode==='turn'?.95:mode==='transition'?(t<2?1.12:t<4?2.31:1.20):mode==='brake'&&t>3?0:2.31;
  speed+=Math.max(-3.6/60,Math.min(3/60,target-speed));
  const turnRate=mode==='turn'?1.6*Math.sin(t*.8):0;
  yaw+=turnRate/60;base.actor.quaternion.setFromAxisAngle(new Vector3(0,1,0),yaw);
  if(stride.active){base.actor.position.add(new Vector3(-Math.cos(yaw),0,Math.sin(yaw)).multiplyScalar(speed/60));stride.update(1/60,{speed,turnRate});}
  else posture.apply(1/60);
  if(mode==='brake'&&speed===0&&f>180&&stride.active){posture.beginGaitSettle();posture.restore();stride.stop();posture.apply(0);}
  if(f%7===3){
   base.bones.forEach((b,i)=>{const n=refined.bones[i];n.position.copy(b.position);n.quaternion.copy(b.quaternion);n.scale.copy(b.scale);});
   for(const [key,rig] of [['before',base],['after',refined]]){const m=score(rig);for(const measure of ['maximum','over2','excess'])result[key][measure]=Math.max(result[key][measure],m[measure]);}
  }
  posture.restore();
 }
 stride.stop();results[mode]=result;
}
return results;
}
