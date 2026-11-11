import {writeFile} from 'node:fs/promises';
import {Vector3} from 'three';
import {loadLanlaoRig} from '../../test-support/lanlao-rig.mjs';
import {createLanlaoPosture} from '../../src/lanlao-posture.js';
import {createLanlaoStride} from '../../src/lanlao-stride.js';

const {model,actor,bones,paws,deformed,indices}=await loadLanlaoRig();
const posture=createLanlaoPosture(model),stride=createLanlaoStride(model,actor,posture);
const bindPaws=paws.map(p=>p.getWorldPosition(new Vector3()));
const base=deformed(),edges=[];
const distance=(a,i,j)=>Math.hypot(a[i*3]-a[j*3],a[i*3+1]-a[j*3+1],a[i*3+2]-a[j*3+2]);
for(let i=0;i<indices.length;i+=3)for(let k=0;k<3;k++){const a=indices[i+k],b=indices[i+(k+1)%3],d=distance(base,a,b);if(d>.001)edges.push({a,b,d});}
const results=[];
for(const profile of ['walk','trot','gallop','transition','turn']){
 actor.position.set(0,0,0);actor.quaternion.identity();stride.stop();stride.start();
 let previous,contacts,lastSpeed=0,yaw=0,maxPawStep=0,maxContactDrift=0,lowest=0,maxJointAngle=0,previousAngles,maxStretch=0,stretched=0;
 let gallopFrames=0,flightFrames=0;const touchdowns=[[],[],[],[]];
 for(let i=0;i<1200;i++){
  const t=i/120;
  const target=profile==='walk'?.29:profile==='trot'?1.15:profile==='gallop'?2.2:profile==='turn'?.5:t<1?.29:t<3?1.15:t<6?2.2:t<8?1.15:.29;
  const speed=lastSpeed+Math.max(-3.6/120,Math.min(3/120,target-lastSpeed));lastSpeed=speed;
  const turn=profile==='turn'?1.2*Math.sin(t*.65):0;
  yaw+=turn/120;actor.quaternion.setFromAxisAngle(new Vector3(0,1,0),yaw);
  actor.position.add(new Vector3(-Math.cos(yaw),0,Math.sin(yaw)).multiplyScalar(speed/120));
  stride.update(1/120,{speed,turnRate:turn});
  const points=paws.map(p=>p.getWorldPosition(new Vector3())),angles=bones.map(b=>b.quaternion.clone()),now=stride.contacts;
  if(stride.weights.gallop>.9){gallopFrames++;if(now.every(x=>!x))flightFrames++;}
  points.forEach((p,j)=>{
   lowest=Math.min(lowest,p.y-bindPaws[j].y);
   if(previous){maxPawStep=Math.max(maxPawStep,p.distanceTo(previous[j]));if(now[j]&&contacts[j])maxContactDrift=Math.max(maxContactDrift,p.distanceTo(previous[j]));}
   if(contacts&&!contacts[j]&&now[j]&&i>500)touchdowns[j].push(t);
  });
  if(previousAngles)angles.forEach((a,j)=>maxJointAngle=Math.max(maxJointAngle,a.angleTo(previousAngles[j])));
  if(i%60===0){const mesh=deformed();let n=0;for(const e of edges){const stretch=distance(mesh,e.a,e.b)/e.d;maxStretch=Math.max(maxStretch,stretch);if(stretch>2)n++;}stretched=Math.max(stretched,n);}
  previous=points;contacts=now;previousAngles=angles;posture.restore();
 }
 results.push({profile,maxPawStep,maxContactDrift,lowest,maxJointAngle,maxStretch,stretched,gallopFrames,flightFrames,touchdowns:touchdowns.map(ts=>ts.slice(0,5))});
}
console.log(JSON.stringify(results,null,2));
await writeFile(new URL('./metrics.json',import.meta.url),JSON.stringify(results,null,2)+'\n');
