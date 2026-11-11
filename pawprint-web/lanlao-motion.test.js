import assert from 'node:assert/strict';
import test from 'node:test';
import {Group, Vector3} from 'three';
import {createLanlaoLocomotion} from './src/lanlao-locomotion.js';
import {lanlaoJumpDuration, sampleLanlaoJump} from './src/lanlao-jump.js';
import {createLanlaoIdle} from './src/lanlao-idle.js';
import {createLanlaoRoute,createLanlaoStepTurn} from './src/lanlao-route.js';

test('open routes vary their bends and never orbit or reverse along the journey',()=>{
 const start=new Vector3(1,0,-2),end=new Vector3(-.3,0,.1),chord=end.clone().sub(start).normalize();
 let left=false,right=false;
 for(const variant of [.1,.3,.55,.8,.95]){
  const route=createLanlaoRoute(start,end,()=>variant);
  let previous=-1;
  for(let step=0;step<=100;step++){
   const frame=route.sample(route.length*step/100);
   const projection=frame.point.clone().sub(start).dot(chord);
   assert(projection>=previous-1e-8,'route doubled back into a loop');previous=projection;
   const curvature=route.curvature(route.length*step/100);
   if(curvature>.02)left=true;if(curvature<-.02)right=true;
  }
  assert(route.length<start.distanceTo(end)*1.15,'route detoured around an unnecessary circle');
  assert(route.sample(route.length).point.distanceTo(end)<1e-8);
 }
 assert(left&&right,'routes must bend in both directions');
});

test('idle head offsets remain smooth and restore the underlying pose',()=>{
 const model=new Group(),body=new Group();body.add(model);
 for(const name of ['Chest','Head','Ear_L','Ear_R','Tail_Base','Tail_Tip']){const bone=new Group();bone.name=name;model.add(bone);}
 const head=model.getObjectByName('Head'),base=head.quaternion.clone();
 const idle=createLanlaoIdle(model,()=>.5);let previous;
 for(let frame=0;frame<2400;frame++){
  idle.apply(1/60,{visible:true,reduced:false,listening:frame>1000&&frame<1200,camera:new Vector3(-2,1,2),body,posture:'stand'});
  if(previous)assert(head.quaternion.angleTo(previous)<.025,'head snapped between frames');
  previous=head.quaternion.clone();idle.restore();assert(head.quaternion.equals(base));
 }
});

test('idle-to-movement fades the sniffing head instead of clearing it in one frame',()=>{
 const model=new Group(),body=new Group();body.add(model);
 for(const name of ['Chest','Head','Ear_L','Ear_R','Tail_Base','Tail_Tip']){const bone=new Group();bone.name=name;model.add(bone);}
 const head=model.getObjectByName('Head'),base=head.quaternion.clone();
 const idle=createLanlaoIdle(model,()=>.5);
 let previous;
 for(let i=0;i<1200;i++){
  idle.apply(1/60,{visible:true,reduced:false,listening:false,camera:new Vector3(-2,1,2),body,posture:'stand'});
  previous=head.quaternion.clone();idle.restore();
  if(i>480&&previous.z>.09)break;
 }
 assert(previous.angleTo(base)>.15,'test must interrupt a visibly lowered head');
 for(let i=0;i<90;i++){
  idle.fade(1/60);
  assert(head.quaternion.angleTo(previous)<.04,'head snapped at the pose boundary');
  previous=head.quaternion.clone();idle.restore();assert(head.quaternion.equals(base));
 }
 assert(previous.angleTo(base)<.001,'idle overlay did not fade out');
});

test('large turns take bounded steps and an interruption completes the current step',()=>{
 for(const angle of [-Math.PI,-1.4,.7,Math.PI]){
  const turn=createLanlaoStepTurn(0,angle);let previous=0,done=false;
  for(let i=0;i<240&&!done;i++){
   const beat=turn.advance(1/60);
   assert(Math.abs(beat.yaw-previous)<.05,'turn heading jumped');
   previous=beat.yaw;done=beat.done;
  }
  assert(done);assert(Math.abs(Math.cos(previous)-Math.cos(angle))<1e-8);
 }
 const interrupted=createLanlaoStepTurn(0,Math.PI);
 interrupted.advance(.2);
 let stopped=false;
 for(let i=0;i<40;i++){const beat=interrupted.advance(1/60,{stopAfterStep:true});if(beat.stepFinished){assert(beat.progress<1e-7||beat.progress===1);stopped=true;break;}}
 assert(stopped,'stop should not wait through the entire reversal');
});

test('jump contacts hold and sampled velocity stays continuous', () => {
 const before = new Float64Array(8), current = new Float64Array(8), after = new Float64Array(8);
 const dt = .00001;
 for (let frame = 0; frame <= lanlaoJumpDuration*1000; frame++) {
  const time = frame / 1000;
  sampleLanlaoJump(time - dt, before);
  sampleLanlaoJump(time, current);
  sampleLanlaoJump(time + dt, after);
  for (let channel = 0; channel < current.length; channel++) {
   const velocityChange = (after[channel] - 2 * current[channel] + before[channel]) / dt;
   assert(Math.abs(velocityChange) < .006, `velocity break at ${time}s in channel ${channel}`);
  }
  if (time <= .14 || time >= .58) assert.equal(current[5], 0);
  if (time <= .34 || time >= .64) assert.equal(current[6], 0);
  assert(current[5] >= 0 && current[6] >= 0);
 }
 sampleLanlaoJump(lanlaoJumpDuration+.1, current);
 assert(current.every(value => value === 0));
 sampleLanlaoJump(.3,current);
 assert(current[5]>0&&current[6]===0,'hind paws must support the front lift before takeoff');
 sampleLanlaoJump(.47,current);
 assert(current[5]>0&&current[6]>0,'a true hop has a short flight phase');
 sampleLanlaoJump(.6,current);
 assert(current[5]===0&&current[6]>0,'front paws should land before hind paws');
});

test('trot advances along its facing, eases out, and remains still after braking', () => {
 const dog = new Group();
 const movement = createLanlaoLocomotion(dog);
 const route=createLanlaoRoute(dog.position,new Vector3(-12,0,1),()=>.8);
 dog.quaternion.setFromAxisAngle(new Vector3(0,1,0),route.sample(0).yaw);
 const dt = 1 / 60;
 const before = new Vector3(), delta = new Vector3(), sideways = new Vector3();
 let firstTravel;
 for (let frame = 0; frame < 360; frame++) {
  before.copy(dog.position);
  const result = movement.move(dt, {route, run:true,pace:1.8});
  delta.subVectors(dog.position, before);
  sideways.set(0, 0, 1).applyQuaternion(dog.quaternion);
  assert(Math.abs(delta.dot(sideways)) < .0001);
  assert(Math.abs(delta.length() - result.clipRate * .865 * dt) < .0001);
  if (frame === 0) firstTravel = delta.length();
 }
 assert(firstTravel > 0 && firstTravel < .004);
 before.copy(dog.position);
 let stopped = false;
 for (let frame = 0; frame < 30 && !stopped; frame++) {
  stopped = movement.move(dt, {route, run:true, brake:true}).arrived;
 }
 assert(stopped);
 assert(dog.position.distanceTo(before) < .35);
 const stoppedAt = dog.position.clone();
 const stoppedFacing=dog.quaternion.clone();
 assert.equal(movement.move(dt, {route, run:true, brake:true}).clipRate, 0);
 assert(dog.position.equals(stoppedAt));
 assert(dog.quaternion.angleTo(stoppedFacing)<1e-7);
});

test('brisk running stays synchronized and settles at short destinations across frame rates',()=>{
 for(const fps of [30,60,120])for(const bend of [.1,.55,.85]){
  const dog=new Group(),movement=createLanlaoLocomotion(dog);
  const route=createLanlaoRoute(dog.position,new Vector3(-1.7,0,.3),()=>bend);
  dog.quaternion.setFromAxisAngle(new Vector3(0,1,0),route.sample(0).yaw);
  let arrived=false,peakSpeed=0,lastSpeed=0;
  for(let frame=0;frame<fps*4&&!arrived;frame++){
   const before=dog.position.clone();
   const travel=movement.move(1/fps,{route,run:true,pace:1.8});
   assert(Math.abs(dog.position.distanceTo(before)-travel.clipRate*.865/fps)<1e-7);
   assert(Math.abs(travel.turnRate)<1.7,'faster travel must still slow for a bend');
   assert(Math.abs(travel.speed-lastSpeed)<3.61/fps,'acceleration or braking jumped');
   lastSpeed=travel.speed;peakSpeed=Math.max(peakSpeed,travel.speed);arrived=travel.arrived;
  }
  assert(arrived&&peakSpeed>1.3);
  assert(dog.position.distanceTo(route.end)<.025);
 }
});

test('a walking approach brakes inside its destination tolerance', () => {
 const dog = new Group();
 const movement = createLanlaoLocomotion(dog);
 const destination = new Vector3(-.16, 0, .42);
 let arrived = false;
 for (let frame = 0; frame < 300 && !arrived; frame++) {
  arrived = movement.move(1 / 60, {destination, pace:1.25}).arrived;
 }
 assert(arrived);
 assert(dog.position.distanceTo(destination) < .025);
});
