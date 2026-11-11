import test from 'node:test';
import assert from 'node:assert/strict';
import {Group, PerspectiveCamera, Vector3} from 'three';
import {createLanlaoAutonomy} from './src/lanlao-autonomy.js';
import {createLanlaoRoamingArea} from './src/lanlao-roaming-area.js';
import {createLanlaoLocomotion} from './src/lanlao-locomotion.js';

function seeded(seed){return ()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};}
const near=new Vector3(-2.33,0,2.16).normalize();
const side=new Vector3(near.z,0,-near.x);
const travelling=activity=>activity.type==='walk'||activity.type==='run';

test('autonomous walks, runs and all resting poses use a wide random area',()=>{
 const planner=createLanlaoAutonomy(seeded(20261109));
 const area=createLanlaoRoamingArea();
 const position=new Vector3(),counts={walk:0,run:0,stand:0,sit:0,lie:0};
 const locations={stand:new Set(),sit:new Set(),lie:new Set()};
 let minDepth=0,maxDepth=-Infinity,minSide=0,maxSide=0,previousBand,consecutiveSameBand=0,fullRuns=0;
 for(let i=0;i<800;i++){
  let activity=planner.next(position);
  assert(Object.hasOwn(counts,activity.type));counts[activity.type]++;
  if(travelling(activity)){
   assert(activity.destination.distanceTo(position)>=.65,'exploration should change location noticeably');
   if(activity.type==='run'){
    const distance=activity.destination.distanceTo(position);
    assert(distance>=1.05,'even constrained runs should noticeably change location');
    if(distance>=1.6)fullRuns++;
   }
   position.copy(activity.destination);
   assert(area.contains(position),'planned point could clip a standing or lying pet');
   const depth=position.dot(near),lateral=position.dot(side);
   minDepth=Math.min(minDepth,depth);maxDepth=Math.max(maxDepth,depth);
   minSide=Math.min(minSide,lateral);maxSide=Math.max(maxSide,lateral);
   const band=depth < -1.8?'far':depth > -.6?'near':'middle';
   if(band===previousBand)consecutiveSameBand++;
   previousBand=band;
   activity=planner.afterTravel();counts[activity.type]++;
  }
  const depth=position.dot(near);
  locations[activity.type].add(depth< -1.8?'far':depth>-.6?'near':'middle');
  if(activity.type==='lie')assert(activity.duration>=20&&activity.duration<=45);
  if(activity.type==='sit')assert(activity.duration>=12&&activity.duration<=24);
  if(activity.type==='stand')assert(activity.duration>=5&&activity.duration<=11);
 }
 for(const [type,count] of Object.entries(counts))assert(count>30,`${type} is missing from spontaneous behaviour`);
 assert(fullRuns/counts.run>.95,'nearly all runs in the normal view should have room for several strides');
 assert(minDepth < -2.7&&maxDepth>0,`insufficient depth: ${minDepth}..${maxDepth}`);
 assert(minSide < -1.4&&maxSide>1.4,'both sides should be used beyond the former narrow strip');
 for(const [pose,zones] of Object.entries(locations))assert.equal(zones.size,3,`${pose} should occur in near, middle and far areas`);
 assert(consecutiveSameBand>30,'locations must not follow a fixed near/far alternation');
});

test('random walks and runs stay in view throughout travel and arrive without circling',()=>{
 for(const seed of [1712,8923,404,20261109]){
 for(const [aspect,angle] of [[1.6,0],[1.15,0],[1.6,1.1]]){
  const camera=new PerspectiveCamera(35,aspect,.05,50);
  camera.position.set(-2.33,1.02,2.16).applyAxisAngle(new Vector3(0,1,0),angle);
  camera.lookAt(0,.43,0);camera.updateMatrixWorld(true);
  const area=createLanlaoRoamingArea(camera);
  const planner=createLanlaoAutonomy(seeded(seed),()=>area);
  const dog=new Group(),movement=createLanlaoLocomotion(dog);
  let completed=0;
  for(let route=0;route<40;route++){
   const yaw=Math.atan2(2*dog.quaternion.w*dog.quaternion.y,1-2*dog.quaternion.y**2);
   const activity=planner.roam(dog.position,route%2===0,{heading:yaw});
   if(!travelling(activity))continue;
   assert(Math.abs(activity.route.sample(0).yaw-yaw)<1e-8,'departure must preserve facing without an in-place turn');
   let arrived=false;
   for(let frame=0;frame<1800&&!arrived;frame++){
    const travel=movement.move(1/60,{destination:activity.destination,route:activity.route,run:activity.type==='run',pace:activity.pace});
    arrived=travel.arrived;
    assert(Math.abs(travel.turnRate)<1.7,'curve caused an abrupt heading change');
    assert(area.contains(dog.position),`route ${route}, frame ${frame}, aspect ${aspect}: pet left the safe frame`);
   }
   assert(arrived,`route ${route}: never settled at destination`);
   assert(dog.position.distanceTo(activity.destination)<.025);
   movement.reset();completed++;
  }
  assert(completed>=35,'safe-target fallback must remain rare in a normal view');
 }
 }
});

test('different random seeds produce different plans',()=>{
 const plans=[1,2,3].map(seed=>{
  const planner=createLanlaoAutonomy(seeded(seed));
  return Array.from({length:20},()=>planner.next(new Vector3()));
 });
 assert.notDeepEqual(plans[0],plans[1]);assert.notDeepEqual(plans[1],plans[2]);
});

test('requested runs reach gallop speed while spontaneous runs vary between trot and gallop',()=>{
 const planner=createLanlaoAutonomy(seeded(917)),dog=new Group();
 const movement=createLanlaoLocomotion(dog);
 for(const playful of [false,true]){
  let fastTime=0,fastRuns=0;
  for(let i=0;i<30;i++){
   const yaw=Math.atan2(2*dog.quaternion.w*dog.quaternion.y,1-2*dog.quaternion.y**2);
   const activity=planner.roam(dog.position,true,{playful,heading:yaw});
   assert.equal(activity.type,'run');
   assert(activity.destination.distanceTo(dog.position)>=1.6);
   movement.reset();
   let arrived=false,peakSpeed=0;
   for(let frame=0;frame<600&&!arrived;frame++){
    const travel=movement.move(1/60,{route:activity.route,run:true,pace:activity.pace});
    peakSpeed=Math.max(peakSpeed,travel.speed);
    if(travel.speed>1.95)fastTime+=1/60;
    arrived=travel.arrived;
   }
   assert(arrived);
   assert(peakSpeed>1.25,'run never accelerated beyond the slow trot');
   if(peakSpeed>1.95)fastRuns++;
  }
  if(playful){assert(fastRuns>=27,'most requested runs need space to gallop');assert(fastTime>10,'gallop should last beyond a fleeting transition');}
  else assert(fastRuns>0&&fastRuns<27,'spontaneous running should have varied speeds');
 }
});

test('successive run routes join without stopping, rotating in place or leaving the frame',()=>{
 for(const fps of [30,60,120]){
  const planner=createLanlaoAutonomy(seeded(91)),area=createLanlaoRoamingArea();
  const dog=new Group(),movement=createLanlaoLocomotion(dog);
  let activity=planner.roam(dog.position,true,{playful:true,heading:0}),lastSpeed=0,totalDistance=0;
  for(let route=0;route<20;route++){
   assert(activity.route,'continuous play ran out of a safe route');
   const next=planner.roam(activity.route.end,true,{playful:true,heading:activity.route.sample(activity.route.length).yaw,startCurvature:activity.route.curvature(activity.route.length)});
   assert(next.route);
   const exitSpeed=Math.min(1.05,1.6/Math.max(.001,Math.abs(activity.route.curvature(activity.route.length)),Math.abs(next.route.curvature(0))));
   let arrived=false;
   for(let frame=0;frame<fps*12&&!arrived;frame++){
    const before=dog.position.clone();
    const travel=movement.move(1/fps,{route:activity.route,nextRoute:next.route,run:true,pace:activity.pace,exitSpeed});
    const distance=dog.position.distanceTo(before);totalDistance+=distance;
    assert(distance<2.4/fps,'position jumped at the route join');
    assert(Math.abs(travel.speed-lastSpeed)<=3.61/fps,'speed reset at a route join');
    assert(Math.abs(travel.turnRate)<1.7,'turn snapped at a route join');
    assert(area.contains(dog.position),'a continuous turn left the safe frame');
    lastSpeed=travel.speed;arrived=travel.arrived;
   }
   assert(arrived&&lastSpeed>.15,'each route should join the next while still moving');
   activity=next;
  }
  assert(totalDistance>45,'continuous play should travel across the area');
 }
});

test('a view with no safe destination falls back to a pause rather than an off-screen run',()=>{
 const planner=createLanlaoAutonomy(seeded(1),()=>({destination:()=>null}));
 const activity=planner.roam(new Vector3(),true);
 assert.equal(activity.type,'stand');assert.equal(activity.destination,undefined);
});

test('a finished long rest does not schedule the same rest immediately again',()=>{
 let choice=.9;
 const planner=createLanlaoAutonomy(()=>choice);
 assert.equal(planner.afterTravel().type,'lie');
 assert.equal(planner.next(new Vector3()).type,'sit');
 assert.equal(planner.next(new Vector3()).type,'lie');
 choice=.97;
 assert.equal(planner.next(new Vector3()).type,'stand');
});
