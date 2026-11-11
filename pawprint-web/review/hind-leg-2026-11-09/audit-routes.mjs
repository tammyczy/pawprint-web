import {PerspectiveCamera,Vector3} from 'three';
import {loadLanlaoRig} from '../../test-support/lanlao-rig.mjs';
import {createLanlaoPosture} from '../../src/lanlao-posture.js';
import {createLanlaoStride} from '../../src/lanlao-stride.js';
import {createLanlaoLocomotion} from '../../src/lanlao-locomotion.js';
import {createLanlaoAutonomy} from '../../src/lanlao-autonomy.js';
import {createLanlaoRoamingArea} from '../../src/lanlao-roaming-area.js';
const rig=await loadLanlaoRig(),{actor,model,bones}=rig,posture=createLanlaoPosture(model),stride=createLanlaoStride(model,actor,posture);
const local=name=>model.worldToLocal(model.getObjectByName(name).getWorldPosition(new Vector3())).toArray();
const results=[];
for(const aspect of [1.6,1.15]){
 const camera=new PerspectiveCamera(35,aspect,.05,50);camera.position.set(-2.33,1.02,2.16);camera.lookAt(0,.43,0);camera.updateMatrixWorld(true);
 const area=createLanlaoRoamingArea(camera);let seed=91;
 const planner=createLanlaoAutonomy(()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;},()=>area);
 actor.position.set(0,0,0);actor.quaternion.identity();stride.start();const movement=createLanlaoLocomotion(actor);
 let activity=planner.roam(actor.position,true,{playful:true,heading:0}),oldRotations,max=0,worst,prior;
 for(let route=0;route<12;route++){
  const next=planner.roam(activity.route.end,true,{playful:true,heading:activity.route.sample(activity.route.length).yaw,startCurvature:activity.route.curvature(activity.route.length)});
  const exitSpeed=Math.min(1.05,1.6/Math.max(.001,Math.abs(activity.route.curvature(activity.route.length)),Math.abs(next.route.curvature(0))));
  let arrived=false;
  for(let f=0;f<1200&&!arrived;f++){
   const travel=movement.move(1/60,{route:activity.route,nextRoute:next.route,run:true,pace:activity.pace,exitSpeed});stride.update(1/60,travel);
   const rotations=bones.map(b=>b.quaternion.clone());
   const detail={route,f,speed:travel.speed,phase:stride.phase,weights:stride.weights,contacts:stride.contacts,targets:stride.targets.map(p=>p.toArray()),
    joints:Object.fromEntries(['Front_L','Front_R','Hind_L','Hind_R'].map(leg=>[leg,['Upper','Lower','Paw'].map(part=>local(`${leg}_${part}`))]))};
   if(oldRotations)rotations.forEach((q,i)=>{const rate=q.angleTo(oldRotations[i])*60;if(rate>max){max=rate;worst={aspect,bone:bones[i].name,max,prior,detail};}});
   prior=detail;oldRotations=rotations;posture.restore();arrived=travel.arrived;
  }
  activity=next;
 }
 results.push(worst);stride.stop();
}
console.log(JSON.stringify(results,null,2));
