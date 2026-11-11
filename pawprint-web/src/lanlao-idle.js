import {MathUtils, Quaternion, Vector3} from 'three';

const fullTurn = Math.PI * 2;
const smooth = value => value * value * (3 - 2 * value);

export function createLanlaoIdle(model, random = Math.random) {
 const chest = model.getObjectByName('Chest');
 const head = model.getObjectByName('Head');
 const ears = ['Ear_L', 'Ear_R'].map(name => model.getObjectByName(name));
 const tail = model.getObjectByName('Tail_Tip');
 const tailBase = model.getObjectByName('Tail_Base');

 // The rig faces -X. Convert model-space axes to each joint's bind orientation.
 function joint(bone) {
  const inverse = bone.getWorldQuaternion(new Quaternion()).invert();
  return {
   bone,
   angles:[0,0,0],
   yaw: new Vector3(0, 1, 0).applyQuaternion(inverse),
   pitch: new Vector3(0, 0, 1).applyQuaternion(inverse),
   tilt: new Vector3(1, 0, 0).applyQuaternion(inverse),
   original: new Quaternion()
  };
 }
 const [look, leftEar, rightEar, tailRoot, tailTip] = [head, ...ears, tailBase, tail].map(joint);
 const joints = [look, leftEar, rightEar, tailRoot, tailTip];
 const offset = new Quaternion();
 const chestScale = new Vector3();
 const children = chest.children.map(bone => ({bone, position: new Vector3(), scale: new Vector3()}));
 const view = new Vector3();
 const headPosition = new Vector3();
 const behaviors = ['look', 'sniff', 'scan'];
 let phase = 0, time = 0, nextBeat = 2, nextBlink = 1.3;
 let beat = 0, side = 1, attention = 0, strength = 0;
 let eyelid = 0, lastPosture = 'stand';
 let applied = false;
 let expansion = 1;
 const headAngles = [0,0,0];

 function smoothHead(yaw,pitch,tilt,dt) {
  const blend=1-Math.exp(-dt*6);
  for(const [i,target] of [yaw,pitch,tilt].entries())headAngles[i]+=(target-headAngles[i])*blend;
  rotate(look,...headAngles);
 }

 function rotate(part, yaw, pitch, tilt) {
  const {bone, original} = part;
  original.copy(bone.quaternion);
  part.angles[0]=yaw;part.angles[1]=pitch;part.angles[2]=tilt;
  bone.quaternion.multiply(offset.setFromAxisAngle(part.yaw, yaw));
  bone.quaternion.multiply(offset.setFromAxisAngle(part.pitch, pitch));
  bone.quaternion.multiply(offset.setFromAxisAngle(part.tilt, tilt));
 }
 function breathe(value){
  expansion=value;
  chestScale.copy(chest.scale);
  chest.scale.multiplyScalar(value);
  for(const {bone,position,scale} of children){
   position.copy(bone.position);scale.copy(bone.scale);
   bone.position.divideScalar(value);bone.scale.divideScalar(value);
  }
 }

 return {
  get blink() {return eyelid;},
  apply(dt, {visible, reduced, listening, camera, body, posture}) {
   if (!visible) {eyelid = 0; return;}
   const blinkTime = time - nextBlink;
   if (!reduced && blinkTime >= 0 && blinkTime < .19) {
    eyelid = blinkTime < .065 ? smooth(blinkTime / .065)
     : 1 - smooth(Math.max(0, (blinkTime - .087) / .103));
   } else eyelid = 0;
   if (blinkTime >= .19) nextBlink = time + 3.4 + random() * 4.6;
   const blend = 1 - Math.exp(-dt * 7);
   strength += ((reduced ? 0 : 1) - strength) * blend;
   if (strength < .001) return;
   time += dt;
   attention += ((listening ? 1 : 0) - attention) * blend;
   // Roughly one breath every three seconds, with a small change in cadence.
   phase += dt * fullTurn * (.32 + .035 * Math.sin(time * .29));
   const breath = .5 - .5 * Math.cos(phase);
   const standing = posture === 'stand';
   if (posture !== lastPosture) {
    if (!standing) nextBeat = time + 2.2 + random() * 1.7;
    lastPosture = posture;
   }
   const lying = posture === 'lie';
   const behavior = standing ? behaviors[beat] : 'look';
   const elapsed = time - nextBeat;
   const gesture = elapsed < 0 || elapsed > 2.6 ? 0
    : smooth(Math.min(1, elapsed / .55)) * smooth(Math.min(1, (2.6 - elapsed) / .85));
   if (elapsed > 2.6) {
    side = random() < .5 ? -1 : 1;
    beat = (beat + 1) % behaviors.length;
    nextBeat = time + 2.8 + random() * 4.7;
   }

   // Counter the uniform expansion at the child joints to keep paws planted.
   breathe(1 + breath * .022 * strength);
   const notice = gesture * (1 - attention);
   const checkingIn = behavior === 'look' ? notice : 0;
   const sniffing = behavior === 'sniff' ? notice : 0;
   const scanning = behavior === 'scan' ? notice : 0;
   view.copy(camera);
   body.worldToLocal(view);
   body.worldToLocal(head.getWorldPosition(headPosition));
   view.sub(headPosition);
   const yaw = Math.atan2(view.z, -view.x);
   const towardViewer = (checkingIn + (standing ? .12 * (1 - notice) : 0))
    * (1 - MathUtils.smoothstep(Math.abs(yaw), .78, 1.48));
   const pitch = Math.atan2(view.y, Math.hypot(view.x, view.z));
   smoothHead((MathUtils.clamp(yaw, -.60, .60) * towardViewer + side * scanning * .29) * strength,
    (breath * .014 - (standing ? .045 * (1 - sniffing) : 0) - MathUtils.clamp(pitch, -.22, .32) * towardViewer
     + (lying ? .085 * (1 - checkingIn) * (1 - attention) - .06 * checkingIn : 0)
     + sniffing * (.27 + .005 * Math.sin(elapsed * fullTurn * 1.6)) - attention * .08) * strength,
    (side * scanning * .08 + towardViewer * .065 + attention * .12) * strength,dt);
   rotate(leftEar, .025 * notice * strength, -.13 * (notice + attention) * strength, 0);
   rotate(rightEar, -.025 * notice * strength, -.08 * (notice + attention) * strength, 0);
   // A short wag accompanies a check-in, with the tip following the base.
   const greeting = checkingIn * (1 - smooth(MathUtils.clamp((elapsed - 1.4) / 1.0, 0, 1)));
   const wagPhase = elapsed * fullTurn * 2.4;
   rotate(tailRoot, .34 * greeting * Math.sin(wagPhase) * strength, 0, 0);
   rotate(tailTip, (.22 * greeting * Math.sin(wagPhase - .65)
    + .075 * scanning * Math.sin(elapsed * 8)) * strength, 0, 0);
   applied = true;
  },
  fade(dt){
   // Restore() removes offsets after each render, but their *values* persist.
   // Ease those values away over the first steps / posture transition rather
   // than dropping the head, ears and breathing back to zero in one frame.
   const decay=Math.exp(-dt*8);
   strength*=decay;attention*=decay;eyelid*=decay;
   breathe(1+(expansion-1)*decay);
   for(const part of joints)rotate(part,...part.angles.map(value=>value*decay));
   for(let i=0;i<3;i++)headAngles[i]=look.angles[i];
   applied=true;
  },
  restore() {
   if (!applied) return;
   chest.scale.copy(chestScale);
   for (const {bone, position, scale} of children) {
    bone.position.copy(position);
    bone.scale.copy(scale);
   }
   for (const {bone, original} of joints) bone.quaternion.copy(original);
   applied = false;
  },
  settle() {
   headAngles.fill(0);
   strength = 0;
   attention = 0;
   eyelid = 0;
   expansion=1;
   for(const part of joints)part.angles.fill(0);
  }
 };
}
