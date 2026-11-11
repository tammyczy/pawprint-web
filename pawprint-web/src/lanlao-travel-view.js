import {Vector3} from 'three';
import {createLanlaoAutonomy} from './lanlao-autonomy.js';
import {createLanlaoRoamingArea} from './lanlao-roaming-area.js';

// A close-up/"come here" pose can be visible yet outside the full-body travel
// footprint. Widen the view before planning, instead of silently cancelling Run.
export function planLanlaoRequestedTravel({camera,target=new Vector3(0,.43,0),position,heading,run,random=Math.random,startCurvature=null}){
 const view=camera.clone(),offset=camera.position.clone().sub(target),distance=offset.length();
 const limit=Math.max(distance,(5+2*position.distanceTo(target))/Math.min(1,Math.max(.6,camera.aspect))),minimum=Math.max(distance,run?3.8:3.2);
 for(let radius=Math.min(minimum,limit);;radius=Math.min(limit,radius+.2)){
  view.position.copy(target).addScaledVector(offset,radius/distance);
  view.lookAt(target);view.updateMatrixWorld(true);
  const area=createLanlaoRoamingArea(view);
  if(area.contains(position,.22)){
   const activity=createLanlaoAutonomy(random,()=>area).roam(position,run,{playful:true,heading,startCurvature});
   if(activity.route)return {activity,cameraPosition:view.position.clone()};
  }
  if(radius===limit)return null;
 }
}
