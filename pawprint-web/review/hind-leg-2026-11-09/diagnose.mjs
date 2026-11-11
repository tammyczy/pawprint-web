import fs from 'node:fs/promises';
import {loadLanlaoRig} from '../../test-support/lanlao-rig.mjs';
import {createLanlaoPosture} from '../../src/lanlao-posture.js';

const source=process.argv[2]??'src/lanlao-stride.js',output=process.argv[3]??'diagnostic.json';
const code=(await fs.readFile(source,'utf8')).replace("'./lanlao-gait-timing.js'","'../../src/lanlao-gait-timing.js'").replace('get phase(){return wrap(cycles);},',
 'get phase(){return wrap(cycles);}, get timing(){return feet.map(f=>({phase:f.phase,offset:f.offset,duty:f.duty}));},');
await fs.writeFile(new URL('./instrumented-stride.js',import.meta.url),code);
const {createLanlaoStride}=await import('./instrumented-stride.js?'+Date.now());
const rig=await loadLanlaoRig(),posture=createLanlaoPosture(rig.model),stride=createLanlaoStride(rig.model,rig.actor,posture);
const difference=(a,b)=>Math.abs(Math.atan2(Math.sin((a-b)*Math.PI*2),Math.cos((a-b)*Math.PI*2)))/(Math.PI*2);
let speed=0,previous,events=[],frames=[],trotFrames=0,unpaired=0,ipsilateral=0,hindTogether=0,minHindGap=.5;
stride.start();
for(let frame=0;frame<120*16;frame++){
 const time=frame/120,target=time<1?.29:time<3?1.15:time<5?2.2:time<7?1.0:time<9?2.2:time<11?1.0:time<13?2.2:1.0;
 speed+=Math.max(-3.6/120,Math.min(3/120,target-speed));rig.actor.position.x-=speed/120;
 stride.update(1/120,{speed});
 const offsets=stride.timing.map(t=>t.offset),weights=stride.weights,contacts=stride.contacts;
 const diagonal=Math.max(difference(offsets[0],offsets[3]),difference(offsets[1],offsets[2]));
 const lateral=Math.min(difference(offsets[0],offsets[2]),difference(offsets[1],offsets[3]));
 const hindGap=difference(offsets[2],offsets[3]);minHindGap=Math.min(minHindGap,hindGap);if(hindGap<.05)hindTogether++;
 if(weights.trot>.9){trotFrames++;if(diagonal>.15)unpaired++;if(lateral<.15)ipsilateral++;}
 if(previous)contacts.forEach((contact,leg)=>{if(contact&&!previous[leg])events.push({time,leg,weights});});
 frames.push({time,speed,weights,phase:stride.phase,offsets,contacts,diagonal,lateral,hindGap});previous=contacts;posture.restore();
}
const summary={source,trotFrames,unpairedTrotFrames:unpaired,ipsilateralTrotFrames:ipsilateral,
 unpairedFraction:unpaired/trotFrames,ipsilateralFraction:ipsilateral/trotFrames,hindTogetherFrames:hindTogether,minHindGap};
await fs.writeFile(new URL(output,import.meta.url),JSON.stringify({summary,events,frames},null,2));
console.log(summary);
