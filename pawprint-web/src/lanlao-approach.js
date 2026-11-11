import {Quaternion,Vector3} from 'three';

const UP=new Vector3(0,1,0);
export const LANLAO_APPROACH_FOCUS_HEIGHT=.46;
// Front-facing coat, paws and tail envelopes. The head and paws have different
// forward extents; a whole-mesh box would reserve empty space in front of the feet.
const envelope=[];
for(const [xs,ys,width] of [
 [[-.49,-.12],[.51,.91],.23],
 [[-.29,.18],[.19,.65],.18],
 [[-.29,.44],[0,.18],.17],
 [[.28,.50],[.29,.65],.13],
])for(const x of xs)for(const y of ys)for(const z of [-width,width])envelope.push(new Vector3(x,y,z));

export function planLanlaoApproach({camera,position}){
 const viewer=camera.position.clone().setY(position.y);
 const toward=viewer.clone().sub(position),distance=toward.length();
 if(distance<.001)return {destination:position.clone(),pace:1,advance:0};
 toward.divideScalar(distance);
 const rotation=new Quaternion().setFromAxisAngle(UP,Math.atan2(toward.z,-toward.x));
 const view=camera.clone(),focus=new Vector3(),projected=new Vector3();
 // Keep a real, finite front edge even after repeated calls. A close camera
 // must never be crossed, and the model itself always supplies the forward step.
 let closest=1.85;
 for(;closest<4;closest+=.025){
  const point=viewer.clone().addScaledVector(toward,-closest);
  focus.copy(point);focus.y+=LANLAO_APPROACH_FOCUS_HEIGHT;
  view.lookAt(focus);view.updateMatrixWorld(true);
  if(envelope.every(vertex=>{
   projected.copy(vertex).applyQuaternion(rotation).add(point).project(view);
   return Math.abs(projected.x)<.82&&projected.y<.75&&projected.y>-.94
    &&projected.z>-1&&projected.z<1;
  }))break;
 }
 const stoppingDistance=Math.max(closest,Math.min(2.25,distance-.22));
 const near=viewer.clone().normalize(),depth=position.dot(near);
 // Run may have widened the camera. Do not chase that camera indefinitely:
 // approach the front of the stage, reserving another step for a repeated call.
 const front=depth<.9?1.1:1.55;
 const stageDistance=Math.max(0,(front-depth)/Math.max(.001,toward.dot(near)));
 const advance=Math.max(0,Math.min(distance-stoppingDistance,stageDistance));
 const destination=position.clone().addScaledVector(toward,advance);
 const remaining=distance-advance;
 let cameraPosition=null;
 if(remaining>stoppingDistance+.025){
  focus.copy(destination);focus.y+=LANLAO_APPROACH_FOCUS_HEIGHT;
  cameraPosition=camera.position.clone().sub(focus).multiplyScalar(stoppingDistance/remaining).add(focus);
 }
 return {destination,advance,cameraPosition,pace:distance>3.3?2:1.35};
}
