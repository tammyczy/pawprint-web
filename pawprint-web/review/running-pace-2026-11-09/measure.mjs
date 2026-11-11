// Run from pawprint-web: node review/running-pace-2026-11-09/measure.mjs
import {writeFile} from 'node:fs/promises';
import {Group,Vector3} from 'three';
import {createLanlaoAutonomy} from '../../src/lanlao-autonomy.js';
import {createLanlaoLocomotion} from '../../src/lanlao-locomotion.js';

let seed=20261109;
const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
const planner=createLanlaoAutonomy(random),dog=new Group(),motion=createLanlaoLocomotion(dog);
const results=[];
for(let i=0;i<60;i++){
 const activity=planner.roam(dog.position,true,{playful:true});
 if(!activity.route)continue;
 motion.reset();dog.quaternion.setFromAxisAngle(new Vector3(0,1,0),activity.route.sample(0).yaw);
 let peakRate=0,peakSpeed=0,frames=0,turn=0,arrived=false,cruiseFrames=0;
 while(!arrived&&frames<1800){
  const p=motion.move(1/60,{route:activity.route,run:true,pace:activity.pace});
  peakRate=Math.max(peakRate,p.clipRate);peakSpeed=Math.max(peakSpeed,p.speed);
  turn=Math.max(turn,Math.abs(p.turnRate));
  if(p.clipRate>=activity.pace*.95)cruiseFrames++;
  arrived=p.arrived;frames++;
 }
 results.push({length:activity.route.length,pace:activity.pace,peakRate,peakSpeed,turn,
  seconds:frames/60,cruiseSeconds:cruiseFrames/60,arrived});
}
await writeFile(new URL('./after.json',import.meta.url),JSON.stringify(results,null,2)+'\n');
for(const key of ['length','peakRate','peakSpeed','seconds','cruiseSeconds','turn']){
 const values=results.map(x=>x[key]).sort((a,b)=>a-b);
 console.log(key,{min:values[0],median:values[Math.floor(values.length/2)],max:values.at(-1)});
}
