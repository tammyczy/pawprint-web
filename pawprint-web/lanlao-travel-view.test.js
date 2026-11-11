import test from 'node:test';
import assert from 'node:assert/strict';
import {PerspectiveCamera,Vector3} from 'three';
import {planLanlaoRequestedTravel} from './src/lanlao-travel-view.js';
import {createLanlaoRoamingArea} from './src/lanlao-roaming-area.js';
const up=new Vector3(0,1,0),target=new Vector3(0,.43,0);
test('Run always gets a route after come-here, close-up zoom, rotated and narrow views',()=>{
 for(const aspect of [.8,1.15,1.6])for(const angle of [0,1.1,-1.5])for(const zoom of [.55,1]){
  const camera=new PerspectiveCamera(35,aspect,.05,50);
  camera.position.set(-2.33,1.02,2.16).sub(target).multiplyScalar(zoom).add(target).applyAxisAngle(up,angle);
  camera.lookAt(target);camera.updateMatrixWorld(true);
  const position=camera.position.clone().setY(0).normalize().multiplyScalar(.83);
  const heading=Math.atan2(position.z,-position.x);let seed=11;
  const plan=planLanlaoRequestedTravel({camera,position,heading,run:true,random:()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;}});
  assert(plan?.activity.route,`Run cancelled after come/zoom: aspect ${aspect}, angle ${angle}, zoom ${zoom}`);
  assert(plan.activity.route.length>1.6);
  const view=camera.clone();view.position.copy(plan.cameraPosition);view.lookAt(target);view.updateMatrixWorld(true);
  const area=createLanlaoRoamingArea(view);
  for(let i=0;i<=100;i++)assert(area.contains(plan.activity.route.sample(plan.activity.route.length*i/100).point),'recovery path left the view');
  assert.equal(plan.activity.route.sample(0).yaw,heading,'recovery teleported the heading');
 }
});
