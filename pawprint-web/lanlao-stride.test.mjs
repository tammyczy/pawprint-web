import test from 'node:test';
import assert from 'node:assert/strict';
import {PerspectiveCamera,Vector3} from 'three';
import {loadLanlaoRig} from './test-support/lanlao-rig.mjs';
import {createLanlaoPosture} from './src/lanlao-posture.js';
import {createLanlaoStride} from './src/lanlao-stride.js';
import {createLanlaoLocomotion} from './src/lanlao-locomotion.js';
import {createLanlaoRoute} from './src/lanlao-route.js';
import {createLanlaoAutonomy} from './src/lanlao-autonomy.js';
import {createLanlaoRoamingArea} from './src/lanlao-roaming-area.js';

const up=new Vector3(0,1,0);
async function setup(){
 const rig=await loadLanlaoRig(),posture=createLanlaoPosture(rig.model);
 return {...rig,posture,stride:createLanlaoStride(rig.model,rig.actor,posture)};
}
const points=rig=>rig.paws.map(p=>p.getWorldPosition(new Vector3()));

test('repeated acceleration and slowdown never merge the hind contacts and restore diagonal trot',async()=>{
 const {actor,posture,stride,paws}=await setup();let speed=0,previous;const events=[];
 stride.start();
 for(let f=0;f<120*16;f++){
  const time=f/120,target=time<1?.29:time<3?1.15:time<5?2.2:time<7?1:time<9?2.2:time<11?1:time<13?2.2:1;
  speed+=Math.max(-3.6/120,Math.min(3/120,target-speed));actor.position.x-=speed/120;
  stride.update(1/120,{speed});const contacts=stride.contacts;
  if(previous)contacts.forEach((contact,leg)=>{if(contact&&!previous[leg]){
   assert(Math.abs(paws[leg].getWorldPosition(new Vector3()).y-.065)<.001,'reported touchdown was not on the ground');
   events.push({time,leg,trot:stride.weights.trot});
  }});
  previous=contacts;posture.restore();
 }
 const hind=events.filter(e=>e.leg>=2);
 for(let i=1;i<hind.length;i++)if(hind[i].leg!==hind[i-1].leg){
  assert(hind[i].time-hind[i-1].time>.04,`hind feet collapsed into the same beat at ${hind[i].time}s`);
 }
 for(const event of events.filter(e=>e.time>1.5&&e.time<15.5&&e.trot>.95)){
  const separation=Math.min(...events.filter(e=>e.leg===3-event.leg).map(e=>Math.abs(e.time-event.time)));
  assert(separation<.065,`body had returned to trot but diagonal paw lagged ${separation}s at ${event.time}s`);
 }
});

test('gallop collects the hind paws under the hips while the neck follows the shoulders',async()=>{
 const rig=await setup(),{actor,model,posture,stride}=rig;
 const chest=model.getObjectByName('Chest'),head=model.getObjectByName('Head');
 const local=b=>model.worldToLocal(b.getWorldPosition(new Vector3()));
 const neck=local(head).distanceTo(local(chest));let oldContacts,landings=0;
 stride.start();
 for(let f=0;f<600;f++){
  const speed=Math.min(2.3,f/120*3);actor.position.x-=speed/120;stride.update(1/120,{speed});
  const contacts=stride.contacts;
  if(f>360){
   assert(Math.abs(local(head).distanceTo(local(chest))-neck)<.028,'head stayed behind as the shoulder moved');
   for(const i of [2,3])if(contacts[i]&&!oldContacts[i]){
    const hip=model.getObjectByName(i===2?'Hind_L_Upper':'Hind_R_Upper');
    assert(local(rig.paws[i]).x<local(hip).x-.06,'hind paw landed behind the hip instead of gathering under the body');landings++;
   }
  }
  oldContacts=contacts;posture.restore();
 }
 assert(landings>=8);
});

test('real rig changes from diagonal trot to distinct rotary gallop contacts and two flight intervals',async()=>{
 const rig=await setup(),{actor,posture,stride}=rig;
 for(const [speed,gait] of [[1.15,'trot'],[2.2,'gallop']]){
  stride.start();let previous,events=[],flightStarts=[],wasFlying=false;
  for(let frame=0;frame<960;frame++){
   actor.position.x-=speed/120;stride.update(1/120,{speed});
   const now=stride.contacts,flying=now.every(c=>!c);
   if(frame>600){
    now.forEach((contact,leg)=>{if(contact&&!previous[leg])events.push({leg,time:frame/120});});
    if(flying&&!wasFlying)flightStarts.push(frame/120);
   }
   previous=now;wasFlying=flying;posture.restore();
  }
  assert(stride.weights[gait]>.99);
  if(gait==='trot'){
   for(const {leg,time} of events)assert(events.some(e=>e.leg===3-leg&&e.time===time),'trot must pair diagonal paws');
  }else{
   assert(events.length>=24,'must observe several complete gallop cycles');
   const next=[2,0,3,1]; // FL → HL → HR → FR → FL, checked against actual contacts.
   for(let i=1;i<events.length;i++){
    assert.equal(events[i].leg,next[events[i-1].leg]);
    assert(events[i].time-events[i-1].time>=1/120,'left and right paws must land separately');
   }
   const frontLeft=events.filter(e=>e.leg===0);
   for(let i=1;i<frontLeft.length;i++)assert.equal(flightStarts.filter(t=>t>frontLeft[i-1].time&&t<frontLeft[i].time).length,2);
  }
  stride.stop();
 }
});

test('real paws stay planted through speed changes and tight turns at 30, 60 and 120 fps',async()=>{
 const rig=await setup(),{actor,bones,posture,stride}=rig;
 for(const fps of [30,60,120])for(const turning of [false,true]){
  actor.position.set(0,0,0);actor.quaternion.identity();stride.start();
  const floor=points(rig).map(p=>p.y);
  let previous,oldContacts,oldRotations,speed=0,yaw=0,maxDrift=0,maxPawSpeed=0,maxJointSpeed=0,worst,worstPaw;
  for(let frame=0;frame<fps*10;frame++){
   const t=frame/fps,target=turning?.5:t<1?.29:t<3?1.15:t<6?2.2:t<8?1.15:.29;
   speed+=Math.max(-3.6/fps,Math.min(3/fps,target-speed));
   const turnRate=turning?1.2*Math.sin(t*.65):0;
   yaw+=turnRate/fps;actor.quaternion.setFromAxisAngle(up,yaw);
   actor.position.add(new Vector3(-Math.cos(yaw),0,Math.sin(yaw)).multiplyScalar(speed/fps));
   stride.update(1/fps,{speed,turnRate});
   const now=points(rig),contacts=stride.contacts,rotations=bones.map(b=>b.quaternion.clone());
   now.forEach((p,i)=>{
    assert(p.y>=floor[i]-.001,'paw penetrated the ground');
    if(previous){
     const change=p.distanceTo(previous[i]);if(change*fps>maxPawSpeed){maxPawSpeed=change*fps;worstPaw={frame,leg:i,speed,turnRate,phase:stride.phase,weights:stride.weights,from:previous[i].toArray(),to:p.toArray(),contacts,oldContacts};}
     if(contacts[i]&&oldContacts[i])maxDrift=Math.max(maxDrift,change);
    }
   });
   if(oldRotations)rotations.forEach((q,i)=>{const rate=q.angleTo(oldRotations[i])*fps;if(rate>maxJointSpeed){maxJointSpeed=rate;worst={frame,bone:bones[i].name,speed,turnRate,phase:stride.phase,weights:stride.weights};}});
   previous=now;oldContacts=contacts;oldRotations=rotations;posture.restore();
  }
  assert(maxDrift<.003,`${fps} fps ${turning?'turn':'transition'}: planted paw slid ${maxDrift}`);
  assert(maxPawSpeed<5,`${fps} fps: paw teleported (${maxPawSpeed} units/s) ${JSON.stringify(worstPaw)}`);
  assert(maxJointSpeed<28,`${fps} fps: knee snapped (${maxJointSpeed} rad/s) ${JSON.stringify(worst)}`);
  stride.stop();
 }
});

test('braking at different gallop phases lands the paws before settling and can sit, lie and stand again',async()=>{
 const rig=await setup(),{actor,bones,bind,posture,stride}=rig;
 for(const stopAt of [1.10,1.19,1.28,1.37]){
  actor.position.set(0,0,0);actor.quaternion.identity();posture.reset();stride.start();
  const movement=createLanlaoLocomotion(actor),route=createLanlaoRoute(actor.position,new Vector3(-12,0,0),()=>0);
  let stopped=false,previous;
  for(let frame=0;frame<240;frame++){
   const travel=movement.move(1/60,{route,run:true,pace:2.6,brake:frame/60>=stopAt});
   stride.update(1/60,travel);previous=points(rig);
   if(travel.arrived){posture.beginGaitSettle();posture.restore();stride.stop();stopped=true;break;}
   posture.restore();
  }
  assert(stopped);const stoppedAt=actor.position.clone();
  for(let frame=0;frame<32;frame++){
   posture.apply(1/60);const now=points(rig);
   now.forEach((p,i)=>assert(p.distanceTo(previous[i])<.035,'last step popped into standing pose'));
   previous=now;posture.restore();
  }
  assert(posture.ready&&posture.current==='stand');assert(actor.position.equals(stoppedAt));
  bones.forEach((b,i)=>{assert(b.position.distanceTo(bind[i].p)<1e-7);assert(b.quaternion.equals(bind[i].q),`${b.name} did not restore its bind rotation`);});
  for(const pose of ['sit','lie','stand']){
   posture.set(pose);
   for(let frame=0;frame<150&&!posture.ready;frame++){posture.apply(1/60);posture.restore();}
   assert(posture.ready&&posture.current===pose,`could not finish ${pose} after braking`);
  }
 }
});

test('actual rig keeps its ground contacts when consecutive routes accelerate and turn in wide and narrow views',async()=>{
 const rig=await setup(),{actor,bones,posture,stride}=rig;
 for(const aspect of [1.6,1.15]){
  const camera=new PerspectiveCamera(35,aspect,.05,50);camera.position.set(-2.33,1.02,2.16);camera.lookAt(0,.43,0);camera.updateMatrixWorld(true);
  const area=createLanlaoRoamingArea(camera);let seed=91;
  const planner=createLanlaoAutonomy(()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;},()=>area);
  actor.position.set(0,0,0);actor.quaternion.identity();stride.start();
  const movement=createLanlaoLocomotion(actor);
  let activity=planner.roam(actor.position,true,{playful:true,heading:0}),previous,oldContacts,oldRotations,maxDrift=0,maxJointSpeed=0,worst;
  for(let route=0;route<12;route++){
   assert(activity.route);
   const next=planner.roam(activity.route.end,true,{playful:true,heading:activity.route.sample(activity.route.length).yaw,startCurvature:activity.route.curvature(activity.route.length)});
   assert(next.route);
   const exitSpeed=Math.min(1.05,1.6/Math.max(.001,Math.abs(activity.route.curvature(activity.route.length)),Math.abs(next.route.curvature(0))));
   let arrived=false;
   for(let frame=0;frame<1200&&!arrived;frame++){
    const travel=movement.move(1/60,{route:activity.route,nextRoute:next.route,run:true,pace:activity.pace,exitSpeed});
    stride.update(1/60,travel);
    const now=points(rig),contacts=stride.contacts,rotations=bones.map(b=>b.quaternion.clone());
    if(previous)now.forEach((p,i)=>{if(contacts[i]&&oldContacts[i])maxDrift=Math.max(maxDrift,p.distanceTo(previous[i]));});
    if(oldRotations)rotations.forEach((q,i)=>{const rate=q.angleTo(oldRotations[i])*60;if(rate>maxJointSpeed){maxJointSpeed=rate;worst={route,frame,bone:bones[i].name,speed:travel.speed,turn:travel.turnRate,phase:stride.phase,weights:stride.weights,contacts};}});
    previous=now;oldContacts=contacts;oldRotations=rotations;posture.restore();arrived=travel.arrived;
   }
   assert(arrived);activity=next;
  }
  assert(maxDrift<.003,`actual route planted paws slid ${maxDrift} at aspect ${aspect}`);
  assert(maxJointSpeed<28,`actual route knee snapped ${maxJointSpeed} rad/s at aspect ${aspect}: ${JSON.stringify(worst)}`);
  stride.stop();
 }
});
