import {MathUtils, Vector3} from 'three';

const PAWS = ['Front_L_Paw', 'Front_R_Paw', 'Hind_L_Paw', 'Hind_R_Paw'];

export function createLanlaoGaitContacts(model) {
 const foot = new Vector3();
 const legs = PAWS.map(name => {
  const paw = model.getObjectByName(name);
  const ground = paw.getWorldPosition(foot).y;
  return {paw, ground, anchor: new Vector3(), target: new Vector3(), planted: false};
 });
 const targets = Array(legs.length).fill(null);

 return {
  reset() {
   for (const leg of legs) leg.planted = false;
   targets.fill(null);
  },
  update({run = false, weight = 1} = {}) {
   for (const [index, leg] of legs.entries()) {
    targets[index] = null;
    leg.paw.getWorldPosition(foot);
    const lift = foot.y - leg.ground;
    const contact = run ? .010 : .009;
    const release = run ? .026 : .024;
    if (lift > release || weight < .16) leg.planted = false;
    if (!leg.planted) {
     if (lift <= contact && weight >= .16) {
      leg.anchor.copy(foot);
      leg.planted = true;
     }
     continue;
    }

    // Capture a world-space contact. Release the correction as the paw
    // lifts, preserving the original clip's swing arc and toe orientation.
    // Strong corrections can push the leg beyond its reach and snap the knee.
    const strength = weight * (run ? .25 : .35) * (1 - MathUtils.smoothstep(lift, contact, release));
    const correction = leg.target.subVectors(leg.anchor, foot).setY(0);
    correction.clampLength(0, run ? .092 : .090).multiplyScalar(strength);
    if (correction.lengthSq() > 1e-8) targets[index] = model.worldToLocal(correction.add(foot));
   }
   return targets;
  }
 };
}
