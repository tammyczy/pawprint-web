import {MathUtils, Quaternion, Vector3} from 'three';
import {sampleLanlaoJump} from './lanlao-jump.js';

const poses = ['stand', 'sit', 'lie'];
const smooth = value => {
 const t = MathUtils.clamp(value, 0, 1);
 return t * t * (3 - 2 * t);
};
const progressBetween = (value, from, to) => smooth((value - from) / (to - from));
const sagittalAxis = new Vector3(0, 0, 1);
const verticalAxis = new Vector3(0, 1, 0);
const rollAxis = new Vector3(1, 0, 0);

export function createLanlaoPosture(model) {
 const modelOrientation = new Quaternion();
 const parentOrientation = new Quaternion();
 const rotation = new Quaternion();
 const local = new Vector3();
 const desired = new Vector3();

 function inModel(bone, out = new Vector3()) {
  return model.worldToLocal(bone.getWorldPosition(out));
 }
 function record(name) {
  const bone = model.getObjectByName(name);
  return {
   bone,
   bindPoint: inModel(bone),
   bindOrientation: bone.getWorldQuaternion(new Quaternion()).premultiply(
    model.getWorldQuaternion(new Quaternion()).invert()
   ),
   previousPosition: new Vector3(),
   previousOrientation: new Quaternion()
  };
 }
 function place(record, point) {
  local.copy(point);
  model.localToWorld(local);
  record.bone.parent.worldToLocal(local);
  record.bone.position.copy(local);
 }
 function orient(record, inModelOrientation) {
  record.bone.parent.getWorldQuaternion(parentOrientation).invert();
  record.bone.quaternion.copy(parentOrientation).multiply(modelOrientation).multiply(inModelOrientation);
 }
 function trunk(record, dx, dy, angle) {
  desired.copy(record.bindPoint);
  desired.x += dx;
  desired.y += dy;
  place(record, desired);
  rotation.setFromAxisAngle(sagittalAxis, angle).multiply(record.bindOrientation);
  orient(record, rotation);
 }

 const body = record('Body');
 const chest = record('Chest');
 const pelvis = record('Pelvis');
 const tail = record('Tail_Base');
 const head = record('Head');
 const legs = ['Front_L', 'Front_R', 'Hind_L', 'Hind_R'].map(name => {
  const upper = record(name + '_Upper');
  const lower = record(name + '_Lower');
  const paw = record(name + '_Paw');
  const upperRay = lower.bindPoint.clone().sub(upper.bindPoint);
  const lowerRay = paw.bindPoint.clone().sub(lower.bindPoint);
  return {
   upper, lower, paw,
   front: name.startsWith('Front'),
   upperLength: upperRay.length(),
   lowerLength: lowerRay.length(),
   upperRay: upperRay.normalize(),
   lowerRay: lowerRay.normalize()
  };
 });
 const legBones = legs.flatMap(({upper, lower, paw}) => [upper, lower, paw]);
 const affected = [body, chest, pelvis, tail, ...legBones];
 const bowBones = [...affected, head];
 const wagBones = [body, chest, pelvis, ...legBones];
 const wagPaws = legs.map(() => new Vector3());
 const pelvisUp = verticalAxis.clone().applyQuaternion(pelvis.bindOrientation.clone().invert());
 const pelvisBindInverse = pelvis.bone.quaternion.clone().invert();
 const wagRotation = new Quaternion();
 const wagOrientation = new Quaternion();
 const gazeBones = [head];
 const jumpFrame = new Float32Array(8);
 const gaitBones = [];
 model.traverse(bone => {
  if (bone.isBone) gaitBones.push({
   bone,
   bindPosition: bone.position.clone(),
   bindQuaternion: bone.quaternion.clone(),
   bindScale: bone.scale.clone(),
   startPosition: new Vector3(),
   startQuaternion: new Quaternion(),
   startScale: new Vector3(),
   previousPosition: new Vector3(),
   previousOrientation: new Quaternion(),
   previousScale: new Vector3()
  });
 });
 const gaitOrientation = new Quaternion();
 const headYaw = new Quaternion();
 const currentRay = new Vector3();
 const currentKnee = new Vector3();
 const hip = new Vector3();
 const knee = new Vector3();
 const target = new Vector3();
 const axis = new Vector3();
 const fold = new Vector3();
 const direction = new Vector3();
 let level = 0;
 let goal = 0;
 let applied = null;
 let gaitTime = null;
 const gaitDuration = .45;

 function aim(record, ray, from, to, orientation = record.bindOrientation) {
  direction.subVectors(to, from).normalize();
  rotation.setFromUnitVectors(ray, direction).multiply(orientation);
  orient(record, rotation);
 }
 function plant(leg, gaitProgress = null) {
  const {upper, lower, paw, front, upperLength, lowerLength} = leg;
  inModel(upper.bone, hip);
  if (gaitProgress !== null) inModel(lower.bone, currentKnee);
  axis.subVectors(target, hip);
  const distance = MathUtils.clamp(axis.length(), Math.abs(upperLength - lowerLength) + .0001,
   upperLength + lowerLength - .0001);
  axis.normalize();
  // The foreleg folds rearward at the elbow, while the rear stifle folds forward.
  if (gaitProgress === null) fold.set(front ? 1 : -1, 0, 0);
  else fold.subVectors(currentKnee, hip);
  fold.addScaledVector(axis, -fold.dot(axis));
  if (fold.lengthSq() < 1e-8) {
   fold.set(front ? 1 : -1, 0, 0).addScaledVector(axis, front ? -axis.x : axis.x);
  }
  fold.normalize();
  const along = (upperLength ** 2 - lowerLength ** 2 + distance ** 2) / (2 * distance);
  const height = Math.sqrt(Math.max(0, upperLength ** 2 - along ** 2));
  knee.copy(hip).addScaledVector(axis, along).addScaledVector(fold, height);
  if (gaitProgress === null) {
   aim(upper, leg.upperRay, hip, knee);
   aim(lower, leg.lowerRay, knee, target);
   orient(paw, paw.bindOrientation);
  } else {
   currentRay.subVectors(currentKnee, hip).normalize();
   upper.bone.getWorldQuaternion(gaitOrientation).premultiply(parentOrientation.copy(modelOrientation).invert());
   aim(upper, currentRay, hip, knee, gaitOrientation);
   inModel(paw.bone, currentRay).sub(knee).normalize();
   lower.bone.getWorldQuaternion(gaitOrientation).premultiply(parentOrientation.copy(modelOrientation).invert());
   aim(lower, currentRay, knee, target, gaitOrientation);
   gaitOrientation.copy(leg.startOrientation).slerp(paw.bindOrientation, gaitProgress);
   orient(paw, gaitOrientation);
  }
 }

 function savePose(records) {
  for (const {bone, previousPosition, previousOrientation, previousScale} of records) {
   previousPosition.copy(bone.position);
   previousOrientation.copy(bone.quaternion);
   previousScale?.copy(bone.scale);
  }
  applied = records;
  model.getWorldQuaternion(modelOrientation);
 }

 function bridgeGait(dt) {
  gaitTime = Math.min(gaitDuration, gaitTime + dt);
  if (gaitTime === gaitDuration) {
   gaitTime = null;
   return;
  }
  savePose(gaitBones);
  const time = gaitTime / gaitDuration;
  const blend = smooth(time);
  for (const record of gaitBones) {
   record.bone.position.lerpVectors(record.startPosition, record.bindPosition, blend);
   record.bone.quaternion.slerpQuaternions(record.startQuaternion, record.bindQuaternion, blend);
   record.bone.scale.lerpVectors(record.startScale, record.bindScale, blend);
  }
  if (time === 0) return;
  for (const leg of legs) {
   const swing = progressBetween(time, leg.swingStart, leg.swingEnd);
   target.lerpVectors(leg.startPoint, leg.paw.bindPoint, swing);
   target.y += leg.lift * Math.sin(Math.PI * swing);
   plant(leg, swing);
  }
 }

 return {
  get ready() {return gaitTime === null && level === goal;},
  get current() {return gaitTime === null && Number.isInteger(level) ? poses[level] : null;},
  get target() {return poses[goal];},
  set(pose) {
   const next = poses.indexOf(pose);
   if (next >= 0) goal = next;
  },
  applyLocomotion({phase,walk,trot,gallop,amount,turn,lean,feet,toes}) {
   savePose(bowBones);
   const cycle=phase*Math.PI*2;
   const fold=Math.cos(cycle-Math.PI*2*.32)*gallop*amount;
   const bounce=amount*(-.020*walk-.035*(trot+gallop)+walk*.003*Math.cos(cycle*2)
    +trot*.009*Math.cos(cycle*2)+gallop*(.010+.022*Math.cos(cycle*2-Math.PI*4*.32)));
   const pitch=.035*gallop*amount*Math.sin(cycle-Math.PI*2*.32);
   trunk(body,0,bounce,pitch*.4);
   trunk(chest,.022*fold,bounce-.007*fold-(.050*gallop+.015*Math.abs(turn))*amount,.10*fold+pitch);
   trunk(pelvis,-.022*fold,bounce+.007*fold-.012*Math.abs(turn)*amount,-.10*fold+pitch*.6);
   // The neck travels with the shoulders. Holding the head at its standing
   // height while lowering the chest stretched the shoulder/neck coat.
   trunk(head,.022*fold-.018*gallop*amount,bounce-.007*fold-(.038*gallop+.010*Math.abs(turn))*amount,.035*fold+.07*gallop*amount);
   for(const [part,yaw,roll] of [[body,0,1],[chest,.025,1],[pelvis,-.018,.7],[head,.06,.25]]){
    part.bone.getWorldQuaternion(wagOrientation).premultiply(parentOrientation.copy(modelOrientation).invert());
    rotation.setFromAxisAngle(verticalAxis,turn*yaw).multiply(wagOrientation);
    orient(part,wagRotation.setFromAxisAngle(rollAxis,lean*roll).multiply(rotation));
   }
   // Let the shoulder/hip yield slightly before a leg reaches its straight-
   // knee singularity. This preserves the paw target without a knee snap.
   for(const [part,start] of [[chest,0],[pelvis,2]]){
    let drop=0;
    for(let i=start;i<start+2;i++){
     const leg=legs[i];inModel(leg.upper.bone,hip);
     const reach=(leg.upperLength+leg.lowerLength)*.975;
     const lateral=(hip.x-feet[i].x)**2+(hip.z-feet[i].z)**2;
     drop=Math.max(drop,hip.y-feet[i].y-Math.sqrt(Math.max(0,reach*reach-lateral)));
    }
    if(drop>0){inModel(part.bone,desired);desired.y-=Math.min(.04,drop);place(part,desired);}
   }
   rotation.setFromAxisAngle(sagittalAxis,-.08*fold).multiply(tail.bindOrientation);
   orient(tail,rotation.premultiply(wagRotation.setFromAxisAngle(verticalAxis,-turn*.07)));
   for(const [i,leg] of legs.entries()){
    target.copy(feet[i]);plant(leg);
    rotation.setFromAxisAngle(sagittalAxis,toes[i]).multiply(leg.paw.bindOrientation);
    orient(leg.paw,rotation);
   }
  },
  applyGaitContacts(targets, {turnRate=0,speed=0,weight=1}={}) {
   const bend=MathUtils.clamp(turnRate*speed*weight,-.8,.8);
   const turning=Math.abs(bend)>.00001;
   if (!targets.some(Boolean)&&!turning) return;
   savePose(turning?wagBones:legBones);
   // Keep the clip's paw positions while the torso leans into the curve.
   // IK then lets the shoulders/hips move over those contacts, not drag them.
   if(turning){
    for(const [i,leg] of legs.entries()){
     inModel(leg.paw.bone,wagPaws[i]);
     leg.startOrientation=leg.paw.bone.getWorldQuaternion(leg.startOrientation??new Quaternion())
      .premultiply(parentOrientation.copy(modelOrientation).invert());
    }
    for(const [part,yaw,roll] of [[body,0,.010],[chest,.016,.010],[pelvis,-.008,.006]]){
     part.bone.getWorldQuaternion(wagOrientation).premultiply(parentOrientation.copy(modelOrientation).invert());
     rotation.setFromAxisAngle(verticalAxis,bend*yaw).multiply(wagOrientation);
     wagRotation.setFromAxisAngle(rollAxis,bend*roll).multiply(rotation);
     orient(part,wagRotation);
    }
   }
   for (let i = 0; i < legs.length; i++) {
    if (!targets[i]) continue;
    const leg = legs[i];
    if(!turning)leg.startOrientation = leg.paw.bone.getWorldQuaternion(leg.startOrientation ?? new Quaternion())
     .premultiply(parentOrientation.copy(modelOrientation).invert());
    target.copy(targets[i]);
    plant(leg, 0);
   }
  },
  beginGaitSettle() {
   for (const {bone, startPosition, startQuaternion, startScale} of gaitBones) {
    startPosition.copy(bone.position);
    startQuaternion.copy(bone.quaternion);
    startScale.copy(bone.scale);
   }
   model.getWorldQuaternion(modelOrientation);
   const ordered = legs.map(leg => {
    const {paw} = leg;
    leg.startPoint = inModel(paw.bone, leg.startPoint);
    leg.startOrientation = paw.bone.getWorldQuaternion(leg.startOrientation ?? new Quaternion())
     .premultiply(parentOrientation.copy(modelOrientation).invert());
    const gap = leg.startPoint.distanceTo(paw.bindPoint);
    leg.lift = MathUtils.clamp(gap * .36, 0, .035);
    return leg;
   }).sort((a, b) => b.startPoint.y - a.startPoint.y);
   ordered.forEach((leg, index) => {
    leg.swingStart = index * .11;
    leg.swingEnd = .57 + index * .14;
   });
   gaitTime = 0;
  },
  reset() {
   gaitTime = null;
   level = 0;
   goal = 0;
  },
  apply(dt, {snap = false} = {}) {
   if (gaitTime !== null) {
    if (!snap) {bridgeGait(dt); return;}
    gaitTime = null;
   }
   const secondsPerLevel = goal > level ? 1.1 : .95;
   level = snap ? goal : level + Math.sign(goal - level) * Math.min(Math.abs(goal - level), dt / secondsPerLevel);
   if (level === 0) return;
   savePose(affected);

   const sit = .27 * progressBetween(level, 0, .57) + .73 * progressBetween(level, .55, 1);
   const lie = Math.max(0, level - 1);
   const chestDrop = progressBetween(lie, 0, .94);
   const bodyDrop = progressBetween(lie, .14, 1);
   const hindDrop = progressBetween(lie, .25, 1);
   trunk(body, .03 * sit - .015 * bodyDrop, -.130 * sit - .106 * bodyDrop, -.72 * sit + .72 * bodyDrop);
   trunk(chest, .0552 * sit - .0702 * chestDrop, -.0641 * sit - .1009 * chestDrop, -.16 * sit + .13 * chestDrop);
   trunk(pelvis, -.0172 * sit - .0078 * hindDrop, -.2553 * sit - .0127 * hindDrop, -.45 * sit + .40 * hindDrop);
   rotation.setFromAxisAngle(sagittalAxis, -.53 * sit - .22 * hindDrop).multiply(tail.bindOrientation);
   orient(tail, rotation);
   legs.forEach((leg, index) => {
    target.copy(leg.paw.bindPoint);
    if (leg.front) {
     const reach = progressBetween(lie, .22 + index * .12, .75 + index * .12);
     target.x -= .25 * reach;
     target.y += .057 * Math.sin(Math.PI * reach);
    } else {
     // Tuck one paw at a time before the pelvis settles over the new stance.
     const offset = (index - 2) * .12;
     const tuck = progressBetween(level, .12 + offset, .53 + offset);
     target.x -= .15 * tuck;
     target.y += .026 * Math.sin(Math.PI * tuck);
    }
    plant(leg);
   });
  },
  applyTailWag() {
   // Follow the clip's existing hip rhythm, including the mixer's fades.
   wagRotation.copy(pelvisBindInverse).multiply(pelvis.bone.quaternion);
   const lateral = wagRotation.x * pelvisUp.x + wagRotation.y * pelvisUp.y + wagRotation.z * pelvisUp.z;
   const swing = MathUtils.clamp(2 * Math.atan2(lateral, wagRotation.w), -.045, .045);
   if (Math.abs(swing) < .0001) return;
   savePose(wagBones);
   for (let i = 0; i < legs.length; i++) {
    const leg = legs[i];
    inModel(leg.paw.bone, wagPaws[i]);
    leg.startOrientation = leg.paw.bone.getWorldQuaternion(leg.startOrientation ?? new Quaternion())
     .premultiply(parentOrientation.copy(modelOrientation).invert());
   }

   inModel(body.bone, desired).z -= swing * .12;
   place(body, desired);
   inModel(pelvis.bone, desired).z -= swing * .25;
   place(pelvis, desired);
   pelvis.bone.quaternion.multiply(wagRotation.setFromAxisAngle(pelvisUp, swing * .5));
   inModel(chest.bone, desired).z += swing * .10;
   place(chest, desired);
   chest.bone.getWorldQuaternion(wagOrientation).premultiply(parentOrientation.copy(modelOrientation).invert());
   orient(chest, wagOrientation.premultiply(wagRotation.setFromAxisAngle(verticalAxis, -swing * .35)));

   // Preserve the authored paw contacts while the legs absorb the weight shift.
   for (let i = 0; i < legs.length; i++) {
    target.copy(wagPaws[i]);
    plant(legs[i], 0);
   }
  },
  applyPlayBow(amount, elapsed, viewerYaw = 0) {
   const bend = MathUtils.clamp(amount, 0, 1);
   if (!bend || gaitTime !== null || level !== 0 || goal !== 0) return;
   savePose(bowBones);

   // Reach forward into the bow while the hind paws support the raised hips.
   const dip = progressBetween(bend, .10, 1);
   trunk(body, -.025 * dip, -.062 * dip, .20 * dip);
   trunk(chest, -.048 * dip, -.137 * dip, .28 * dip);
   trunk(pelvis, .008 * dip, -.006 * dip, .10 * dip);

   // Let the muzzle follow the dip, with a small glance toward the playmate.
   rotation.setFromAxisAngle(sagittalAxis, .095 * dip).multiply(head.bindOrientation);
   headYaw.setFromAxisAngle(verticalAxis, viewerYaw * .35 * dip);
   orient(head, rotation.premultiply(headYaw));
   const wag = Math.sin(elapsed * Math.PI * 7) * .28 * dip;
   rotation.setFromAxisAngle(verticalAxis, wag).multiply(tail.bindOrientation);
   orient(tail, rotation);
   for (const [index, leg] of legs.entries()) {
    target.copy(leg.paw.bindPoint);
    if (leg.front) {
     const reach = progressBetween(bend, index * .10, .66 + index * .10);
     target.x -= .145 * reach;
     target.y += .032 * Math.sin(Math.PI * reach);
     target.z += Math.sign(target.z) * .018 * reach;
    }
    plant(leg);
   }
  },
  applyGreetingPop(amount, viewerYaw = 0, attention = 0) {
   const rise = MathUtils.clamp(amount, 0, 1) * .78;
   if ((!rise && !attention && !viewerYaw) || gaitTime !== null || level !== 0 || goal !== 0) return;
   savePose(rise ? bowBones : gazeBones);
   if (!rise) {
    rotation.setFromAxisAngle(sagittalAxis, -.06 * attention).multiply(head.bindOrientation);
    orient(head, rotation.premultiply(headYaw.setFromAxisAngle(verticalAxis, viewerYaw)));
    return;
   }

   // Rock over the hind feet as the chest and both front paws lift together.
   trunk(body, .076 * rise, .063 * rise, -.33 * rise);
   trunk(chest, .091 * rise, .135 * rise, -.48 * rise);
   trunk(pelvis, .036 * rise, -.024 * rise, -.22 * rise);
   rotation.setFromAxisAngle(sagittalAxis, -.12 * rise - .06 * attention).multiply(head.bindOrientation);
   headYaw.setFromAxisAngle(verticalAxis, viewerYaw);
   orient(head, rotation.premultiply(headYaw));
   rotation.setFromAxisAngle(sagittalAxis, -.10 * rise).multiply(tail.bindOrientation);
   orient(tail, rotation);

   for (const leg of legs) {
    target.copy(leg.paw.bindPoint);
    if (leg.front) {
     target.x += .08 * rise;
     target.y += .225 * rise;
    }
    plant(leg);
    if (leg.front) {
     rotation.setFromAxisAngle(sagittalAxis, .29 * rise).multiply(leg.paw.bindOrientation);
     orient(leg.paw, rotation);
    }
   }
  },
  applyJump(time) {
   if (gaitTime !== null || level !== 0 || goal !== 0) return;
   sampleLanlaoJump(time, jumpFrame);
   const [hipX, hipY, chestX, chestY, pitch, foreLift, rearLift, tuck] = jumpFrame;
   savePose(bowBones);
   trunk(body, (hipX + chestX) * .5, (hipY + chestY) * .5, pitch * .65);
   trunk(chest, chestX, chestY, pitch);
   trunk(pelvis, hipX, hipY, pitch * .54);
   rotation.setFromAxisAngle(sagittalAxis, pitch * .38).multiply(head.bindOrientation);
   orient(head, rotation);
   rotation.setFromAxisAngle(sagittalAxis, pitch * -.7).multiply(tail.bindOrientation);
   orient(tail, rotation);
   const frontTuck = tuck * smooth(foreLift / .08);
   const rearTuck = smooth(rearLift / .17);
   for (const leg of legs) {
    target.copy(leg.paw.bindPoint);
    target.y += leg.front ? foreLift : rearLift;
    target.x += leg.front ? .078 * frontTuck : -.040 * rearTuck;
    plant(leg);
    const toe = leg.front ? .35 * frontTuck : -.16 * rearTuck;
    rotation.setFromAxisAngle(sagittalAxis, toe).multiply(leg.paw.bindOrientation);
    orient(leg.paw, rotation);
   }
  },
  applyGreetingTurn(progress, angle) {
   if (progress <= 0 || progress >= 1 || gaitTime !== null || level !== 0 || goal !== 0) return;
   savePose(affected);

   const dip = Math.sin(Math.PI * progress) * Math.min(1, Math.abs(angle));
   trunk(body, 0, -.030 * dip, 0);
   trunk(chest, 0, -.033 * dip, 0);
   trunk(pelvis, 0, -.027 * dip, 0);

   const actorTurn = smooth(progress);
   for (const leg of legs) {
    const inner = leg.paw.bindPoint.z * angle > 0;
    const lead = leg.front ? inner : !inner;
    const start = (leg.front ? .045 : .17) + (lead ? 0 : .29);
    const swing = progressBetween(progress, start, start + .43);
    // The two contact anchors are fixed in world space. Express them in
    // the rotating model's local frame, and move between them in flight.
    const localAngle = angle * (swing - actorTurn);
    target.copy(leg.paw.bindPoint).applyAxisAngle(verticalAxis, localAngle);
    target.y += (.022 + .025 * Math.min(1, Math.abs(angle))) * Math.sin(Math.PI * swing);
    plant(leg);
    rotation.setFromAxisAngle(verticalAxis, localAngle).multiply(leg.paw.bindOrientation);
    orient(leg.paw, rotation);
   }
  },
  restore() {
   if (!applied) return;
   for (const {bone, previousPosition, previousOrientation, previousScale} of applied) {
    bone.position.copy(previousPosition);
    bone.quaternion.copy(previousOrientation);
    if (previousScale) bone.scale.copy(previousScale);
   }
   applied = null;
  }
 };
}
