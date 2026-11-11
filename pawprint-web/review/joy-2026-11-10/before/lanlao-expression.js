import {MathUtils, Quaternion, Vector3} from 'three';

const turn = Math.PI * 2;
const lift = value => MathUtils.smoothstep(value, 0, 1);
const gaitModes = new Set(['approach', 'come', 'dash', 'explore', 'home', 'peel', 'run', 'walk']);
const gestures = new Set(['bow', 'greeting', 'jump', 'turn', 'wag']);
const viewerWeight = {
 approach: .9, bow: 0, come: .9, dash: .12, explore: .15,
 greeting: .22, home: 0, jump: .25, peel: 0, run: .13, turn: 0, wag: .65, walk: .25
};

function blinkPulse(elapsed) {
 if (elapsed < 0 || elapsed >= .17) return 0;
 return lift(elapsed / .052) * (1 - lift((elapsed - .065) / .105));
}

export function createLanlaoExpression(model) {
 const forward = new Vector3(-1, 0, 0);
 const bindFrame = model.getWorldQuaternion(new Quaternion());
 const scratch = new Quaternion();
 const heading = new Vector3();
 const view = new Vector3();
 const headPosition = new Vector3();
 const actorDirection = new Vector3();
 const previousActorDirection = new Vector3();
 const offsets = new Float64Array(9);

 function joint(name) {
  const bone = model.getObjectByName(name);
  const axisFrame = bone.getWorldQuaternion(new Quaternion()).invert().multiply(bindFrame);
  return {
   bone,
   original: new Quaternion(),
   forward: forward.clone().applyQuaternion(axisFrame),
   yaw: new Vector3(0, 1, 0).applyQuaternion(axisFrame),
   pitch: new Vector3(0, 0, 1).applyQuaternion(axisFrame),
   roll: new Vector3(1, 0, 0).applyQuaternion(axisFrame)
  };
 }
 const head = joint('Head');
 const left = joint('Ear_L');
 const right = joint('Ear_R');
 const tail = joint('Tail_Base');
 const tip = joint('Tail_Tip');
 const joints = [head, left, right, tail, tip];

 let applied = false;
 let initialized = false;
 let clock = 0;
 let strength = 0;
 let eyelid = 0;
 let previousPitch = 0;
 let earLag = 0;
 let earRebound = 0;

 function rotate(part, yaw, pitch, roll) {
  const {bone, original} = part;
  original.copy(bone.quaternion);
  bone.quaternion.multiply(scratch.setFromAxisAngle(part.yaw, yaw));
  bone.quaternion.multiply(scratch.setFromAxisAngle(part.pitch, pitch));
  bone.quaternion.multiply(scratch.setFromAxisAngle(part.roll, roll));
 }

 function follow(index, target, speed, dt) {
  offsets[index] += (target - offsets[index]) * (1 - Math.exp(-dt * speed));
  return offsets[index];
 }

 return {
  get blink() {return eyelid;},
  apply(dt, {mode, visible, reduced, body, camera, engaged = false, listening = false,
   gestureDepth = 0, gestureTime = 0, gestureLook = 1, greetingLandingAge, jumpTime = 0, gaitPhase, petting = false}) {
   if (!visible || reduced || mode === 'wag') {
    offsets.fill(0);
    strength = 0;
    eyelid = 0;
    initialized = false;
    earLag = 0;
    earRebound = 0;
    return;
   }
   const moving = gaitModes.has(mode);
   const checkingIn = mode === 'stop' && (engaged || listening);
   const beingPetted = mode === 'stop' && petting;
   const active = moving || checkingIn || beingPetted || gestures.has(mode);
   strength += ((active ? 1 : 0) - strength) * (1 - Math.exp(-dt * (beingPetted ? 3 : active ? 13 : 4)));
   eyelid = mode === 'greeting' ? blinkPulse((greetingLandingAge ?? -1) - .04)
    : mode === 'jump' ? blinkPulse(jumpTime - .61) : 0;
   if (strength < .001) {initialized = false; return;}
   clock += dt;
   head.bone.getWorldPosition(headPosition);
   heading.copy(head.forward).applyQuaternion(head.bone.getWorldQuaternion(scratch));
   view.copy(camera).sub(headPosition).normalize();
   actorDirection.copy(forward).applyQuaternion(body.getWorldQuaternion(scratch));
   const currentPitch = Math.atan2(heading.y, Math.hypot(heading.x, heading.z));
   const desiredPitch = Math.atan2(view.y, Math.hypot(view.x, view.z));
   const viewerYaw = Math.atan2(heading.z * view.x - heading.x * view.z, heading.x * view.x + heading.z * view.z);
   const pitchSpeed = initialized ? MathUtils.clamp((currentPitch - previousPitch) / Math.max(dt, .008), -4, 4) : 0;
   const turnSpeed = initialized ? MathUtils.clamp(
    (previousActorDirection.z * actorDirection.x - previousActorDirection.x * actorDirection.z) /
    Math.max(dt, .008), -4, 4) : 0;
   previousPitch = currentPitch;
   previousActorDirection.copy(actorDirection);
   initialized = true;

   const checkIn = moving ? .69 + .31 * Math.sin(clock * 2.4) : 1;
   const towardViewer = (checkingIn ? .95 : viewerWeight[mode] ?? 0)
    * (mode === 'greeting' ? gestureLook : 1)
    * (1 - MathUtils.smoothstep(Math.abs(viewerYaw), .85, 1.85));
   const interest = towardViewer * (listening || engaged ? 1 : checkIn);
   const perk = mode === 'greeting' ? lift(gestureTime / .12) * gestureLook
    : mode === 'approach' ? .72 : mode === 'bow' ? gestureDepth * .19 : beingPetted ? .22 : checkingIn ? .74 : interest * .65;
   const turnLead = mode === 'turn' || moving ? turnSpeed * .030 : 0;
   const yaw = follow(0, MathUtils.clamp(viewerYaw * interest * .32 + turnLead, -.22, .22), 15, dt);
   const pitch = follow(1, MathUtils.clamp((currentPitch - desiredPitch) * interest * .24 - perk * .045, -.13, .10), 14, dt);
   const roll = follow(2, MathUtils.clamp(viewerYaw, -.65, .65) * perk * .10, 9, dt);

   // The ears pick up the head motion, then relax at slightly different rates.
   earLag += (pitchSpeed * .047 - earLag) * (1 - Math.exp(-dt * 17));
   earRebound += (earLag - earRebound) * (1 - Math.exp(-dt * 8));
   const recoil = earLag - .64 * earRebound;
   const travel = moving ? (mode === 'run' || mode === 'dash' ? .90 : .47) : 0;
   const bounce = Number.isFinite(gaitPhase) ? Math.sin(gaitPhase * turn * 2) * travel * .043 : 0;
   const leftPitch = follow(3, recoil + bounce - perk * .12, 19, dt);
   const rightPitch = follow(4, recoil * .81 + bounce * .64 - perk * .082, 13, dt);
   const earIn = follow(5, perk * .063, 12, dt);
   const wag = beingPetted ? .11 : mode === 'greeting' || mode === 'approach' ? .185 : mode === 'peel' ? .095 : travel * .070;
   const wagPhase = clock * turn * (beingPetted ? 1.4 : 3.5);
   const tailYaw = follow(6, wag * Math.sin(wagPhase), 26, dt);
   const tipYaw = follow(7, wag * .63 * Math.sin(wagPhase - .68), 21, dt);
   const tailLift = follow(8, perk * -.075 + recoil * .3, 12, dt);

   rotate(head, yaw * strength, pitch * strength, roll * strength);
   rotate(left, -earIn * strength, leftPitch * strength, (.023 * perk + bounce) * strength);
   rotate(right, earIn * strength, rightPitch * strength, (-.016 * perk + bounce * .64) * strength);
   rotate(tail, tailYaw * strength, tailLift * strength, 0);
   rotate(tip, tipYaw * strength, tailLift * .5 * strength, 0);
   applied = true;
  },
  restore() {
   if (!applied) return;
   for (const {bone, original} of joints) bone.quaternion.copy(original);
   applied = false;
  }
 };
}
