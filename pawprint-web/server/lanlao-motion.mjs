import {readFile} from 'node:fs/promises';
import {
 AnimationClip, AnimationMixer, Bone, Group, LoopOnce, MathUtils, Object3D,
 Quaternion, QuaternionKeyframeTrack, Vector3, VectorKeyframeTrack,
} from 'three';
import {createLanlaoPosture} from '../src/lanlao-posture.js';
import {createLanlaoStride} from '../src/lanlao-stride.js';
import {lanlaoJumpDuration} from '../src/lanlao-jump.js';
import {lanlaoStrideLength} from '../src/lanlao-gait-timing.js';
import {LANLAO_TROT_SPEED, LANLAO_WALK_SPEED} from '../src/lanlao-locomotion.js';
import {createLanlaoAttention, createLanlaoGreeting, lanlaoPlayBowDuration, sampleLanlaoPlayBow} from '../src/lanlao-attention.js';
import {readGLB, readPackedAccessor, writeGLB} from './glb.mjs';

const sourceModel = new URL('../public/models/lanlao-web.glb', import.meta.url);
const pawNames = ['Front_L', 'Front_R', 'Hind_L', 'Hind_R'];
const tripoLegNames = ['0_Left_Limb', '0_Right_Limb', '1_Left_Limb', '1_Right_Limb'];
const up = new Vector3(0, 1, 0);
const samplesPerSecond = 30;
const maxSourceBytes = 75 * 1024 * 1024;

function readRig({document}) {
 const scene = new Group();
 const jointIds = new Set(document.skins?.[0]?.joints);
 const nodes = document.nodes.map((entry, index) => {
  const node = jointIds.has(index) ? new Bone() : new Object3D();
  node.name = entry.name ?? '';
  if (entry.matrix) node.matrix.fromArray(entry.matrix).decompose(node.position, node.quaternion, node.scale);
  else {
   if (entry.translation) node.position.fromArray(entry.translation);
   if (entry.rotation) node.quaternion.fromArray(entry.rotation);
   if (entry.scale) node.scale.fromArray(entry.scale);
  }
  return node;
 });
 document.nodes.forEach((entry, index) => {
  for (const child of entry.children ?? []) nodes[index].add(nodes[child]);
 });
 for (const index of document.scenes[document.scene ?? 0].nodes) scene.add(nodes[index]);
 scene.updateMatrixWorld(true);
 const bones = new Map([...jointIds].map(index => [nodes[index].name.replace(/^tripo::/, ''), nodes[index]]));
 return {scene, nodes, bones};
}

function bind(bone) {
 return {
  bone, point: bone.getWorldPosition(new Vector3()), orientation: bone.getWorldQuaternion(new Quaternion()),
  position: bone.position.clone(), rotation: bone.quaternion.clone(),
 };
}

function lanlaoLegs(rig) {
 return pawNames.map(name => ['Upper', 'Lower', 'Paw'].map(part => bind(rig.bones.get(name + '_' + part))));
}

function targetLegs(rig) {
 if (pawNames.every(name => rig.bones.has(name + '_Paw'))) return lanlaoLegs(rig);
 return tripoLegNames.map((name, index) => {
  const chain = [...rig.bones]
   .filter(([key]) => key.startsWith(name + '_') && /^\d+$/.test(key.slice(name.length + 1)))
   .sort(([a], [b]) => Number(a.slice(name.length + 1)) - Number(b.slice(name.length + 1)))
   .map(([, bone]) => bone);
  if (chain.length < 3 || chain.slice(1).some((bone, i) => bone.parent !== chain[i])) throw new Error('UNSUPPORTED_PET_LEG_RIG');
  // Tripo can add a shoulder joint and extra wrist/hock links. Keep those
  // links in the skin and solve between the actual upper, knee and paw pivots.
  const first = index < 2 ? Math.max(0, chain.length - 4) : 0;
  return [chain[first], chain[first + 1], chain.at(-1)].map(bind);
 });
}

function orientationOf(legs) {
 const forward = legs[0][2].point.clone().add(legs[1][2].point).sub(legs[2][2].point).sub(legs[3][2].point);
 return Math.atan2(forward.x, forward.z);
}

function place(record, point) {
 record.bone.position.copy(record.bone.parent.worldToLocal(point.clone()));
}

function orient(record, world) {
 const parent = record.bone.parent.getWorldQuaternion(new Quaternion()).invert();
 record.bone.quaternion.copy(parent.multiply(world)).normalize();
}

function keepTailAboveFloor(tail, clearance) {
 for (let i = 0; i < tail.length - 1; i++) {
  const parent = tail[i];
  const origin = parent.bone.getWorldPosition(new Vector3());
  const child = tail[i + 1].bone.getWorldPosition(new Vector3());
  if (child.y >= clearance) continue;
  const ray = child.sub(origin), length = ray.length();
  if (length < 1e-6) continue;
  // Preserve the span and sideways swing while lifting the low part of the tail.
  const height = MathUtils.clamp(clearance - origin.y, -length, length);
  const raised = new Vector3(ray.x, 0, ray.z).normalize().multiplyScalar(Math.sqrt(length ** 2 - height ** 2));
  raised.y = height;
  if (raised.lengthSq() < 1e-10) continue;
  const lift = new Quaternion().setFromUnitVectors(ray.normalize(), raised.normalize());
  orient(parent, lift.multiply(parent.bone.getWorldQuaternion(new Quaternion())));
 }
}

function legSolver([upper, knee, paw]) {
 const upperRay = knee.point.clone().sub(upper.point);
 const lowerRay = paw.point.clone().sub(knee.point);
 const upperLength = upperRay.length(), lowerLength = lowerRay.length();
 const restAxis = paw.point.clone().sub(upper.point).normalize();
 const bend = upperRay.clone().addScaledVector(restAxis, -upperRay.dot(restAxis)).normalize();
 if (upperLength < 1e-5 || lowerLength < 1e-5 || bend.lengthSq() < 1e-6) throw new Error('UNSUPPORTED_PET_LEG_RIG');
 upperRay.normalize();
 lowerRay.normalize();
 return (hipPoint, foot, pawOrientation) => {
  place(upper, hipPoint);
  const reach = foot.clone().sub(hipPoint);
  const distance = MathUtils.clamp(reach.length(), Math.abs(upperLength - lowerLength) + 1e-5, upperLength + lowerLength - 1e-5);
  const axis = reach.normalize();
  const fold = bend.clone().addScaledVector(axis, -bend.dot(axis)).normalize();
  const along = (upperLength ** 2 + distance ** 2 - lowerLength ** 2) / (2 * distance);
  const elbow = hipPoint.clone().addScaledVector(axis, along)
   .addScaledVector(fold, Math.sqrt(Math.max(0, upperLength ** 2 - along ** 2)));
  const planted = hipPoint.clone().addScaledVector(axis, distance);
  orient(upper, new Quaternion().setFromUnitVectors(upperRay, elbow.clone().sub(hipPoint).normalize()).multiply(upper.orientation));
  orient(knee, new Quaternion().setFromUnitVectors(lowerRay, planted.sub(elbow).normalize()).multiply(knee.orientation));
  orient(paw, pawOrientation);
 };
}

function retarget(source, target) {
 const fromLegs = lanlaoLegs(source), toLegs = targetLegs(target);
 const yaw = new Quaternion().setFromAxisAngle(up, orientationOf(toLegs) - orientationOf(fromLegs));
 const inverseYaw = yaw.clone().invert();
 const height = legs => legs.reduce((sum, [upper,,paw]) => sum + upper.point.y - paw.point.y, 0);
 const scale = height(toLegs) / height(fromLegs);
 if (!Number.isFinite(scale) || scale < 1e-4 || scale > 500) throw new Error('UNSUPPORTED_PET_SCALE');

 const tails = [...target.bones.keys()].filter(name => /^Tail_\d+$/.test(name)).sort(
  (a,b) => Number(a.slice(5)) - Number(b.slice(5)),
 );
 const tripo = target.bones.has('Spine_0');
 const names = tripo
  ? [['Body','Spine_0'], ['Chest','Spine_2'], ['Head','Head_0'], ['Tail_Base',tails[0]], ['Tail_Tip',tails.length > 1 ? tails[Math.ceil((tails.length - 1) / 2)] : null]]
  : ['Body','Chest','Pelvis','Head','Tail_Base','Tail_Tip'].map(name => [name,name]);
 const torso = names.filter(([,name]) => target.bones.has(name)).map(
  ([a,b]) => [bind(source.bones.get(a)), bind(target.bones.get(b))],
 );
 if (torso.length < 3) throw new Error('UNSUPPORTED_PET_SPINE');
 const hip = tripo ? bind(target.bones.get('Root')) : null;
 const sourceHip = bind(source.bones.get('Pelvis'));
 const pivot = toLegs[2][0].point.clone().lerp(toLegs[3][0].point, .5);
 const tailRoot = torso.find(([from]) => from.bone.name === 'Tail_Base')?.[1];
 const tailBones = tails.map(name => bind(target.bones.get(name)));
 if (tailRoot && tripo) {
  // On the Tripo rig the named tail starts after the short links at the
  // rump. Include those links in ground clearance so the hip can still sit.
  for (let i = 0; i < 2; i++) {
   const parent = tailBones[0].bone.parent;
   if (!parent.isBone || parent === hip.bone || parent.children.length !== 1) break;
   tailBones.unshift(bind(parent));
  }
 }
 const records = [...new Map(
  [...(hip ? [hip] : []), ...torso.map(([,to]) => to), ...toLegs.flat(), ...tailBones].map(record => [record.bone,record]),
 ).values()];
 const tailClearance = Math.min(...toLegs.map(([, ,paw]) => paw.point.y)) + .036 * scale;
 const solve = toLegs.map(legSolver);
 const translation = (from, to) => source.scene.worldToLocal(from.bone.getWorldPosition(new Vector3()))
  .sub(from.point).applyQuaternion(yaw).multiplyScalar(scale).add(to.point);
 const rotation = (from, to) => yaw.clone().multiply(from.bone.getWorldQuaternion(new Quaternion()))
  .multiply(from.orientation.clone().invert()).multiply(inverseYaw).multiply(to.orientation);
 return {
  records,
  pose() {
   for (const record of records) {
    record.bone.position.copy(record.position);
    record.bone.quaternion.copy(record.rotation);
   }
   let hipLift = 0;
   if (hip) {
    // Tripo attaches the back legs and several rump deformers straight to
    // Root. Move that cluster around the hip, then place the chest separately.
    const orientation = rotation(sourceHip, hip);
    const offset = orientation.clone().multiply(hip.orientation.clone().invert());
    place(hip, hip.point.clone().sub(pivot).applyQuaternion(offset).add(translation(sourceHip, {point:pivot})));
    orient(hip, orientation);
    if (tailBones.length) {
     hipLift = Math.max(0, tailClearance - tailBones[0].bone.getWorldPosition(new Vector3()).y);
     if (hipLift > 0) place(hip, hip.bone.getWorldPosition(new Vector3()).addScaledVector(up, hipLift));
    }
   }
   for (const [from,to] of torso) {
    if (!tripo || !from.bone.name.startsWith('Tail_')) place(to, translation(from,to));
    orient(to, rotation(from,to));
   }
   keepTailAboveFloor(tailBones, tailClearance);
   for (let i = 0; i < fromLegs.length; i++) {
    const [a,,b] = fromLegs[i], [upper,,paw] = toLegs[i];
    const upperPoint = translation(a,upper);
    if (i >= 2) upperPoint.y += hipLift;
    solve[i](upperPoint, translation(b,paw), rotation(b,paw));
   }
  },
 };
}

function wagClip(glb, rig) {
 const animation = glb.document.animations.find(clip => clip.name === 'Tail_Wag_Natural');
 const tracks = [];
 for (const {sampler, target} of animation.channels) {
  const bone = rig.nodes[target.node];
  if (!bone.isBone) continue;
  const {input, output, interpolation} = animation.samplers[sampler];
  const times = readPackedAccessor(glb, input), values = readPackedAccessor(glb, output);
  if (!times || !values || interpolation === 'CUBICSPLINE') throw new Error('UNSUPPORTED_LANLAO_MOTION');
  if (target.path === 'rotation') tracks.push(new QuaternionKeyframeTrack(bone.name + '.quaternion', times, values));
  if (target.path === 'translation') tracks.push(new VectorKeyframeTrack(bone.name + '.position', times, values));
  if (target.path === 'scale') tracks.push(new VectorKeyframeTrack(bone.name + '.scale', times, values));
 }
 return new AnimationClip(animation.name, -1, tracks);
}

function motionSource(name, glb, rig) {
 const actor = new Group();
 actor.add(rig.scene);
 const posture = createLanlaoPosture(rig.scene);
 if (name === 'Walk_Refined' || name === 'Run_Trot_Natural') {
  const run = name === 'Run_Trot_Natural';
  const speed = run ? LANLAO_TROT_SPEED * 2.5 : LANLAO_WALK_SPEED;
  const stride = createLanlaoStride(rig.scene, actor, posture);
  const step = dt => {
   actor.position.x -= speed * dt;
   posture.restore();
   stride.update(dt, {speed});
  };
  stride.start();
  for (let i = 0; i < 6 * samplesPerSecond; i++) step(1 / samplesPerSecond);
  return {duration: lanlaoStrideLength(stride.weights) / speed, loop: true, step: (_, dt) => dt && step(dt)};
 }
 if (name === 'Jump_Natural') return {duration: lanlaoJumpDuration, step: time => {
  posture.restore();
  posture.applyJump(time);
 }};
 if (name === 'Tail_Wag_Natural') {
  const clip = wagClip(glb, rig), mixer = new AnimationMixer(rig.scene);
  const action = mixer.clipAction(clip).setLoop(LoopOnce, 1).play();
  action.clampWhenFinished = true;
  return {duration: clip.duration, step: time => {
   posture.restore();
   mixer.setTime(time);
   posture.applyTailWag();
  }};
 }
 if (name === 'Play_Bow') {
  return {duration: lanlaoPlayBowDuration, step: time => {
   posture.restore();
   posture.applyPlayBow(sampleLanlaoPlayBow(time), time);
  }};
 }
 if (name === 'Greeting_Bounce') {
  const attention = createLanlaoAttention(), greeting = createLanlaoGreeting(attention);
  attention.engage();
  return {duration: 2.4, step: time => {
   posture.restore();
   const frame = greeting.sample(time);
   posture.applyGreetingPop(frame.depth, 0, frame.look);
  }};
 }
 const from = name === 'Stand_From_Sit' ? 'sit' : name === 'Stand_From_Lie' ? 'lie' : 'stand';
 const to = name === 'Sit' ? 'sit' : name === 'Lie_Down' ? 'lie' : 'stand';
 posture.set(from);
 posture.apply(0, {snap: true});
 posture.restore();
 posture.set(to);
 const duration = to === 'sit' ? 1.1 : to === 'lie' ? 2.2 : from === 'sit' ? .95 : 1.9;
 return {duration, step: (_, dt) => {
  posture.restore();
  posture.apply(dt);
 }};
}

export const LANLAO_MOTION_CLIPS = [
 'Walk_Refined', 'Run_Trot_Natural', 'Tail_Wag_Natural', 'Jump_Natural',
 'Sit', 'Lie_Down', 'Stand_From_Sit', 'Stand_From_Lie', 'Play_Bow', 'Greeting_Bounce',
];

export async function bakeLanlaoMotion(bytes) {
 if (bytes.length > maxSourceBytes) throw new Error('PET_RIG_TOO_LARGE');
 const targetGlb = readGLB(bytes);
 const {document, binary} = targetGlb;
 if (!binary || document.buffers?.length !== 1 || !document.skins?.[0]?.joints?.length) throw new Error('UNSUPPORTED_PET_RIG');
 const source = readGLB(await readFile(sourceModel));
 const chunks = [binary];
 let offset = binary.length;
 const accessor = (values, type, count, range = {}) => {
  const buffer = Buffer.from(values.buffer, values.byteOffset, values.byteLength);
  const bufferView = document.bufferViews.push({buffer: 0, byteOffset: offset, byteLength: buffer.length}) - 1;
  offset += buffer.length;
  chunks.push(buffer);
  return document.accessors.push({bufferView, componentType: 5126, count, type, ...range}) - 1;
 };

 document.animations = LANLAO_MOTION_CLIPS.map(name => {
  const sourceRig = readRig(source), targetRig = readRig(targetGlb);
  const motion = retarget(sourceRig, targetRig);
  const sequence = motionSource(name, source, sourceRig);
  const intervals = Math.ceil(sequence.duration * samplesPerSecond), count = intervals + 1;
  const dt = sequence.duration / intervals;
  const times = Float32Array.from({length: count}, (_, index) => dt * index);
  const tracks = motion.records.map(({bone}) => ({
   bone, positions: new Float32Array(count * 3), rotations: new Float32Array(count * 4), previous: bone.quaternion.clone(),
  }));
  for (let frame = 0; frame < count; frame++) {
   sequence.step(dt * frame, frame === 0 ? 0 : dt);
   motion.pose();
   for (const {bone, positions, rotations, previous} of tracks) {
    bone.position.toArray(positions, frame * 3);
    bone.quaternion.toArray(rotations, frame * 4);
    if (previous.dot(bone.quaternion) < 0) for (let i = frame * 4; i < frame * 4 + 4; i++) rotations[i] *= -1;
    previous.fromArray(rotations, frame * 4);
   }
  }
  const input = accessor(times, 'SCALAR', count, {min: [0], max: [times.at(-1)]});
  const animation = {name, samplers: [], channels: []};
  for (const {bone, positions, rotations} of tracks) {
   if (sequence.loop) {
    positions.set(positions.subarray(0,3), intervals * 3);
    rotations.set(rotations.subarray(0,4), intervals * 4);
   }
   const node = targetRig.nodes.indexOf(bone);
   for (const [path, type, values] of [['translation','VEC3',positions], ['rotation','VEC4',rotations]]) {
    const sampler = animation.samplers.push({input, output: accessor(values, type, count), interpolation:'LINEAR'}) - 1;
    animation.channels.push({sampler, target:{node, path}});
   }
  }
  return animation;
 });
 document.buffers[0].byteLength = offset;
 return writeGLB(document, Buffer.concat(chunks, offset));
}
