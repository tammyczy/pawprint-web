import test from 'node:test';
import assert from 'node:assert/strict';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
import {Bone, Group, Quaternion, Vector3} from 'three';
import {createLanlaoRoute} from './src/lanlao-route.js';
import {createLanlaoLocomotion} from './src/lanlao-locomotion.js';
import {createLanlaoGaitContacts} from './src/lanlao-gait-contacts.js';
import {createLanlaoPosture} from './src/lanlao-posture.js';

test('contact corrections avoid joint snaps in the real walk and run clips', async () => {
 await MeshoptDecoder.ready;
 const document = await new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({'meshopt.decoder':MeshoptDecoder}).read('public/models/lanlao-rig-motion-refined.glb');
 const root = document.getRoot();
 const skin = root.listSkins()[0];
 const model = new Group();
 const dog = new Group();
 dog.add(model);
 const bones = new Map(skin.listJoints().map(node => {
  const bone = new Bone();
  bone.name = node.getName();
  bone.position.fromArray(node.getTranslation());
  bone.quaternion.fromArray(node.getRotation());
  bone.scale.fromArray(node.getScale());
  return [node, bone];
 }));
 for (const [node, bone] of bones) {
  for (const child of node.listChildren()) {
   if (bones.has(child)) bone.add(bones.get(child));
  }
 }
 model.add(bones.get(skin.getSkeleton() ?? skin.listJoints()[0]));
 const bind=[...bones.values()].map(bone=>({bone,p:bone.position.clone(),q:bone.quaternion.clone(),s:bone.scale.clone()}));
 const paws = ['Front_L', 'Front_R', 'Hind_L', 'Hind_R']
  .map(name => model.getObjectByName(name + '_Paw'));
 const jointNames = ['Front_L_Upper', 'Front_L_Lower', 'Front_R_Upper', 'Front_R_Lower',
  'Hind_L_Upper', 'Hind_L_Lower', 'Hind_R_Upper', 'Hind_R_Lower'];
 const joints = jointNames.map(name => model.getObjectByName(name));
 const locomotion = createLanlaoLocomotion(dog);
 const contacts = createLanlaoGaitContacts(model);
 const posture = createLanlaoPosture(model);

 function sample(channel, time) {
  const sampler = channel.getSampler();
  const times = sampler.getInput().getArray();
  const values = sampler.getOutput();
  const next = times.findIndex(value => value >= time);
  const high = next < 0 ? times.length - 1 : next;
  const low = Math.max(0, high - 1);
  const fraction = next < 0 ? 1 : next === 0 ? 0 : (time - times[low]) / (times[high] - times[low]);
  return [values.getElement(low, []), values.getElement(high, []), fraction];
 }

 for (const [run,pace] of [[false,1],[true,1],[true,1.4],[true,1.8]]) {
  const clip = root.listAnimations().find(item => item.getName() === (run ? 'Run_Trot_Natural' : 'Walk_Refined'));
  const channels = clip.listChannels().filter(channel => bones.has(channel.getTargetNode()));
  const duration = Math.max(...channels.map(channel => channel.getSampler().getInput().getArray().at(-1)));
  if(run&&pace>1)assert(duration/pace>.38&&duration/pace<.52,'deployed trot must complete a cycle at the intended brisk cadence');
  dog.position.set(0, 0, 0);
  const route=createLanlaoRoute(dog.position,new Vector3(-12,0,1.8),()=>.8);
  dog.quaternion.setFromAxisAngle(new Vector3(0,1,0),route.sample(0).yaw);
  locomotion.reset();
  contacts.reset();
  let previousRaw, previousFixed, last;
  let time = 0, maxRawAngle = 0, maxFixedAngle = 0, maxFixedStep = 0, rawDrift = 0, fixedDrift = 0;

  for (let frame = 0; frame < 1200; frame++) {
   const dt = 1 / 120;
   const travel = locomotion.move(dt, {route, run, pace});
   const {clipRate}=travel;
   time = (time + dt * clipRate) % duration;
   for (const channel of channels) {
    const bone = bones.get(channel.getTargetNode());
    const [first, second, fraction] = sample(channel, time);
    if (channel.getTargetPath() === 'rotation') bone.quaternion.fromArray(first).slerp(new Quaternion().fromArray(second), fraction);
    else if (channel.getTargetPath() === 'translation') bone.position.fromArray(first).lerp(new Vector3().fromArray(second), fraction);
    else if (channel.getTargetPath() === 'scale') bone.scale.fromArray(first).lerp(new Vector3().fromArray(second), fraction);
   }
   const raw = paws.map(paw => paw.getWorldPosition(new Vector3()));
   const rawRotations = joints.map(joint => joint.quaternion.clone());
   if (previousRaw) rawRotations.forEach((q, index) => {
    maxRawAngle = Math.max(maxRawAngle, q.angleTo(previousRaw[index]));
   });
   posture.applyGaitContacts(contacts.update({run}),travel);
   const fixed = paws.map(paw => paw.getWorldPosition(new Vector3()));
   const fixedRotations = joints.map(joint => joint.quaternion.clone());
   if (previousFixed) fixedRotations.forEach((q, index) => {
    maxFixedAngle = Math.max(maxFixedAngle, q.angleTo(previousFixed[index]));
   });
   if([180,340,610,1150].includes(frame)){
    // Interrupt at different support/swing phases, exactly as stopGait does.
    posture.beginGaitSettle();
    posture.restore();
    const clipPose=bind.map(({bone})=>[bone.position.clone(),bone.quaternion.clone(),bone.scale.clone()]);
    for(const {bone,p,q,s} of bind){bone.position.copy(p);bone.quaternion.copy(q);bone.scale.copy(s);}
    let lastPaws=fixed;
    for(let step=0;step<70;step++){
     posture.apply(1/120);
     const points=paws.map(paw=>paw.getWorldPosition(new Vector3()));
     points.forEach((point,i)=>assert(point.distanceTo(lastPaws[i])<.02,`stop snapped paw ${i}`));
     lastPaws=points;
     posture.restore();
    }
    assert(posture.ready&&posture.current==='stand','stop did not settle into standing');
    bind.forEach(({bone,p,q,s},i)=>{
     assert(bone.position.distanceTo(p)<1e-7&&bone.quaternion.equals(q));
     bone.position.copy(clipPose[i][0]);bone.quaternion.copy(clipPose[i][1]);bone.scale.copy(clipPose[i][2]);
    });
   }
   posture.restore();
   const onGround = raw.map(point => point.y < .074);
   if (frame > 240 && last) {
    for (let index = 0; index < paws.length; index++) {
     if (!onGround[index] || !last.onGround[index]) continue;
     rawDrift += Math.hypot(raw[index].x - last.raw[index].x, raw[index].z - last.raw[index].z);
     const step = Math.hypot(fixed[index].x - last.fixed[index].x, fixed[index].z - last.fixed[index].z);
     fixedDrift += step;
     maxFixedStep = Math.max(maxFixedStep, step);
    }
   }
   previousRaw = rawRotations;
   previousFixed = fixedRotations;
   last = {onGround, raw, fixed};
  }
  assert.ok(maxFixedAngle < maxRawAngle + .025, `joint discontinuity: run=${run}, pace=${pace}, corrected=${maxFixedAngle}, raw=${maxRawAngle}`);
  assert.ok(fixedDrift < rawDrift, 'contact correction should reduce average paw drift');
  assert.ok(maxFixedStep < .01, `contact correction caused a paw jump at pace ${pace}: ${maxFixedStep}`);
 }
});
