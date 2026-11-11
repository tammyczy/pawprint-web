import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,PerspectiveCamera,Vector3} from 'three';
import {planLanlaoApproach,LANLAO_APPROACH_FOCUS_HEIGHT} from './src/lanlao-approach.js';
import {createLanlaoLocomotion} from './src/lanlao-locomotion.js';
import {planLanlaoRequestedTravel} from './src/lanlao-travel-view.js';

const up=new Vector3(0,1,0);
function view(scale=1,aspect=1.6,angle=0){
 const camera=new PerspectiveCamera(35,aspect,.05,50);
 camera.position.set(-2.33,1.02,2.16).multiplyScalar(scale).applyAxisAngle(up,angle);
 camera.lookAt(0,.43,0);camera.updateMatrixWorld(true);return camera;
}
function advance(dog,camera){
 const plan=planLanlaoApproach({camera,position:dog.position});
 const movement=createLanlaoLocomotion(dog),start=dog.position.clone();
 let arrived=false;
 for(let i=0;i<1800&&!arrived;i++){
  const previous=dog.position.clone(),before=dog.quaternion.clone();
  const frame=movement.move(1/60,{destination:plan.destination,pace:plan.pace,faceBeforeMoving:true,faceOnArrival:camera.position});
  assert(dog.quaternion.angleTo(before)<.029,'approach snapped its heading');
  if(dog.position.distanceTo(previous)>.0001){
   const forward=new Vector3(-1,0,0).applyQuaternion(dog.quaternion);
   const viewer=camera.position.clone().sub(dog.position).setY(0).normalize();
   assert(forward.dot(viewer)>.95,'walked before facing the viewer');
   assert(dog.position.clone().sub(previous).dot(viewer)>0,'stepped away while being called closer');
  }
  arrived=frame.arrived;
 }
 assert(arrived,'approach failed to finish');
 if(plan.cameraPosition){camera.position.copy(plan.cameraPosition);camera.lookAt(dog.position.x,LANLAO_APPROACH_FOCUS_HEIGHT,dog.position.z);camera.updateMatrixWorld(true);}
 const forward=new Vector3(-1,0,0).applyQuaternion(dog.quaternion);
 const viewer=camera.position.clone().sub(dog.position).setY(0).normalize();
 assert(forward.dot(viewer)>.9999,'did not finish facing the camera');
 return dog.position.distanceTo(start);
}

test('come turns to the viewer before walking, from either side and when facing away',()=>{
 for(const rotation of [0,1.8,-2])for(const point of [[0,0,0],[1,0,-1.5],[-1.1,0,-1]]){
  const camera=view(1,1.6,rotation),dog=new Group();dog.position.fromArray(point).applyAxisAngle(up,rotation);
  dog.quaternion.setFromAxisAngle(up,Math.atan2(camera.position.z-dog.position.z,dog.position.x-camera.position.x)+Math.PI);
  assert(advance(dog,camera)>.25);
 }
});

test('repeated come commands take another real step, then acknowledge without crossing the front edge',()=>{
 const camera=view(),dog=new Group(),cameraPosition=camera.position.clone();
 const first=advance(dog,camera),second=advance(dog,camera),third=advance(dog,camera);
 assert(first>.8);assert(second>.17);assert(third>.12);
 for(let i=0;i<8;i++)advance(dog,camera);
 const closePosition=dog.position.clone();
 assert(advance(dog,camera)<.03,'repeated commands escaped the close-up boundary');
 assert(closePosition.distanceTo(camera.position.clone().setY(0))>1.8,'came through the camera');
 assert(camera.position.equals(cameraPosition),'forward motion was faked by camera movement');
});

test('a close approach can still depart into a run in wide, rotated and narrow views',()=>{
 for(const aspect of [.75,1.6])for(const scale of [1,1.5])for(const rotation of [-1.3,1.2]){
  const camera=view(scale,aspect,rotation),dog=new Group();
  for(let i=0;i<5;i++)advance(dog,camera);
  camera.lookAt(dog.position.x,LANLAO_APPROACH_FOCUS_HEIGHT,dog.position.z);camera.updateMatrixWorld(true);
  const heading=Math.atan2(camera.position.z-dog.position.z,dog.position.x-camera.position.x);
  let seed=5;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  assert(planLanlaoRequestedTravel({camera,position:dog.position,heading,run:true,random})?.activity.route,
   `close-up stranded the dog: ${aspect}/${scale}/${rotation}`);
 }
});

test('stop can interrupt the facing step without unwanted forward movement',()=>{
 const camera=view(),dog=new Group(),movement=createLanlaoLocomotion(dog);
 const destination=planLanlaoApproach({camera,position:dog.position}).destination;
 dog.quaternion.setFromAxisAngle(up,Math.atan2(camera.position.z,-camera.position.x)+Math.PI);
 for(let i=0;i<15;i++)movement.move(1/60,{destination,faceBeforeMoving:true,faceOnArrival:camera.position});
 const before=dog.position.clone();let stopped=false;
 for(let i=0;i<100&&!stopped;i++)stopped=movement.move(1/60,{destination,brake:true,faceBeforeMoving:true,faceOnArrival:camera.position}).arrived;
 assert(stopped);assert(dog.position.distanceTo(before)<.005);
});
