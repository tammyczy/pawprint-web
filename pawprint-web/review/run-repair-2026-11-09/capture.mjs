import fs from 'node:fs/promises';
import {Vector3,Matrix4} from 'three';
import {loadLanlaoRig} from '../../test-support/lanlao-rig.mjs';
const before=process.argv.includes('--before'),prefix=before?'./before/':'../../src/';
const {createLanlaoPosture}=await import(prefix+'lanlao-posture.js');
const {createLanlaoStride}=await import(prefix+'lanlao-stride.js');
const {model,actor,bones}=await loadLanlaoRig('public/models/lanlao-rig-hip-refined.glb');
const posture=createLanlaoPosture(model),stride=createLanlaoStride(model,actor,posture);
const matrices=()=>{model.updateWorldMatrix(true,true);const inverse=model.matrixWorld.clone().invert();return Object.fromEntries(bones.map(b=>[b.name,new Matrix4().multiplyMatrices(inverse,b.matrixWorld).toArray()]));};
const data={rest:matrices(),frames:[]};
function record(label){data.frames.push({frame:data.frames.length+1,label,phase:stride.phase,bones:matrices()});}
for(const [label,speed,turn] of [['walk',.28,0],['trot',1.2,0],['gallop',2.35,0],['turn',1.0,1.6]]){
 actor.position.set(0,0,0);actor.quaternion.identity();stride.start();let yaw=0;
 for(let f=0;f<480;f++){
  const actual=Math.min(speed,f/120*3);yaw+=turn/120;actor.quaternion.setFromAxisAngle(new Vector3(0,1,0),yaw);
  actor.position.add(new Vector3(-Math.cos(yaw),0,Math.sin(yaw)).multiplyScalar(actual/120));
  stride.update(1/120,{speed:actual,turnRate:turn});
  if((f>=360&&f%10===0)||(f<90&&f%15===0))record(label);
  posture.restore();
 }
 stride.stop();
}
actor.position.set(0,0,0);actor.quaternion.identity();stride.start();
for(let f=0;f<240;f++){
 const speed=Math.max(0,Math.min(2.2,f/120*3,2.2-(f/120-1)*3.6));
 actor.position.x-=speed/120;stride.update(1/120,{speed});
 if(f>=120&&f%10===0)record('brake');
 if(f===210){posture.beginGaitSettle();posture.restore();stride.stop();break;}
 posture.restore();
}
for(let f=0;f<60;f++){posture.apply(1/120);if(f%10===0)record('settle');posture.restore();}
for(const target of ['sit','lie','stand']){
 posture.set(target);for(let f=0;f<140;f++){posture.apply(1/60);if([35,75,130].includes(f))record(target);posture.restore();}
}
await fs.writeFile(new URL(before?'./before/poses.json':'./poses.json',import.meta.url),JSON.stringify(data));
console.log({before,poses:data.frames.length});
