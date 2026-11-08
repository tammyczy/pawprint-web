import test from 'node:test';
import assert from 'node:assert/strict';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
import {
 AnimationClip, AnimationMixer, Bone, Group, QuaternionKeyframeTrack,
 Vector3, VectorKeyframeTrack
} from 'three';
import {createLanlaoPosture} from './src/lanlao-posture.js';

test('wag keeps planted paws stable through the authored clip', async () => {
 await MeshoptDecoder.ready;
 const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({'meshopt.decoder': MeshoptDecoder});
 const document = await io.read('public/models/lanlao-base.glb');
 const skin = document.getRoot().listSkins()[0];
 const model = new Group();
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
 model.updateMatrixWorld(true);

 const animation = document.getRoot().listAnimations().find(clip => clip.getName() === 'Tail_Wag_Natural');
 const tracks = [];
 for (const channel of animation.listChannels()) {
  const bone = bones.get(channel.getTargetNode());
  const kind = channel.getTargetPath();
  const property = {translation:'position', rotation:'quaternion', scale:'scale'}[kind];
  if (!bone || !property) continue;
  const sampler = channel.getSampler();
  const Track = kind === 'rotation' ? QuaternionKeyframeTrack : VectorKeyframeTrack;
  tracks.push(new Track(bone.uuid + '.' + property, sampler.getInput().getArray(), sampler.getOutput().getArray()));
 }
 const mixer = new AnimationMixer(model);
 mixer.clipAction(new AnimationClip('wag', -1, tracks)).play();
 const posture = createLanlaoPosture(model);
 const paws = ['Front_L_Paw', 'Front_R_Paw', 'Hind_L_Paw', 'Hind_R_Paw']
  .map(name => model.getObjectByName(name));
 const start = paws.map(() => new Vector3());
 const previous = paws.map(() => new Vector3());
 const position = new Vector3();
 const maxDrift = [0, 0, 0, 0];
 const maxStep = [0, 0, 0, 0];

 for (let frame = 0; frame <= 240; frame++) {
  posture.restore();
  mixer.setTime(frame / 60);
  model.updateMatrixWorld(true);
  posture.applyTailWag();
  model.updateMatrixWorld(true);
  paws.forEach((paw, index) => {
   paw.getWorldPosition(position);
   if (frame === 0) {
    start[index].copy(position);
    previous[index].copy(position);
   }
   maxDrift[index] = Math.max(maxDrift[index],
    Math.hypot(position.x - start[index].x, position.z - start[index].z));
   maxStep[index] = Math.max(maxStep[index], position.distanceTo(previous[index]));
   previous[index].copy(position);
  });
 }
 for (const drift of maxDrift) assert.ok(drift < .003, `paw drifted ${drift}`);
 for (const step of maxStep) assert.ok(step < .002, `paw jumped ${step}`);
});
