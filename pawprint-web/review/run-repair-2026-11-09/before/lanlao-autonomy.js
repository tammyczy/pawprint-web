import {createLanlaoRoamingArea} from './lanlao-roaming-area.js';
import {createLanlaoRoute,createLanlaoHeadingRoute} from './lanlao-route.js';

// Animation pacing, not a clinical model of canine behaviour. Longer rests
// separate short bouts of exploration; greeting and jumping require interaction.
export function createLanlaoAutonomy(random = Math.random, getArea = createLanlaoRoamingArea) {
 let last = 'stand';
 const between = (low, high) => low + random() * (high - low);
 function rest(type) {
  last = type;
  return {type, duration: type === 'lie' ? between(20, 45)
   : type === 'sit' ? between(12, 24) : between(5, 11)};
 }
 function roam(position, run = random() < .28, {playful = false, heading = null, startCurvature = null} = {}) {
  const area=getArea();
  // Give a run enough space to accelerate, take several strides, then brake.
  let destination=null,route=null;
  for(let attempt=0;attempt<(heading===null?1:12);attempt++){
   const target=area.destination(position,random,{minDistance:run?2.2:.65});
   if(!target)continue;
   const candidate=heading===null?createLanlaoRoute(position,target,random,area.contains,{bendScale:run?.55:1})
    :createLanlaoHeadingRoute(position,target,heading,area.contains,{startCurvature});
   if(!candidate)continue;
   if(!route||candidate.maxCurvature<route.maxCurvature){destination=candidate.end;route=candidate;}
   if(heading===null||candidate.maxCurvature<3.5)break;
  }
  if(!route)return rest('stand');
  last = run ? 'run' : 'walk';
  // Root speed selects walk/trot/gallop in the shared stride controller.
  return {type:last, destination, route, pace:run
   ? between(playful ? 2.4 : 1.5, playful ? 2.7 : 2.4) : between(.85, 1.1)};
 }
 return {
  roam,
  afterTravel() {
   const choice = random();
   return rest(choice < .4 ? 'stand' : choice < .65 ? 'sit' : 'lie');
  },
  next(position,{heading=null}={}) {
   const choice = random();
   // Avoid consecutive long rests in the same spot, without a fixed sequence.
   if (choice < (last === 'stand' ? .65 : .8)) return roam(position,undefined,{heading});
   if(last==='lie')return rest(choice<.94?'sit':'stand');
   if(last==='sit')return rest(choice<.94?'lie':'stand');
   return rest(choice < .8 ? 'sit' : choice < .94 ? 'lie' : 'stand');
  }
 };
}
