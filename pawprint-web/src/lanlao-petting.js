import {MathUtils, Vector3} from 'three';

// Move the torso gently while keeping the leg roots at their existing world
// positions. This preserves the planted-paw pose from posture and idle.
export function createLanlaoPetting(model) {
 const body = model.getObjectByName('Body');
 const chest = model.getObjectByName('Chest');
 const pelvis = model.getObjectByName('Pelvis');
 const frontLegs = ['Front_L_Upper', 'Front_R_Upper'].map(name => model.getObjectByName(name));
 const bones = [body, chest, pelvis, ...frontLegs];
 const original = bones.map(() => new Vector3());
 const world = bones.map(() => new Vector3());
 const target = new Vector3();
 const offset = new Vector3();
 const origin = new Vector3();
 let strength = 0;
 let side = 0;
 let applied = false;

 function place(bone, position) {
  bone.position.copy(bone.parent.worldToLocal(target.copy(position)));
 }

 return {
  apply(dt, {active, available, side: contactSide}) {
   if (!available) {
    strength = 0;
    side = 0;
    return;
   }
   strength = MathUtils.damp(strength, active ? 1 : 0, active ? 2.5 : 3, dt);
   side = MathUtils.damp(side, contactSide, 2.5, dt);
   if (strength < .001) return;

   model.updateWorldMatrix(true, true);
   bones.forEach((bone, index) => {
    original[index].copy(bone.position);
    bone.getWorldPosition(world[index]);
   });

   // Work in model space so leaning follows the pet as it turns.
   origin.set(0, 0, 0);
   offset.set(-.002 * strength, -.0015 * strength, .004 * side * strength);
   model.localToWorld(origin);
   model.localToWorld(offset).sub(origin);

   place(body, world[0].clone().addScaledVector(offset, .5));
   body.updateWorldMatrix(false, true);
   place(pelvis, world[2]);
   place(chest, world[1].clone().add(offset));
   chest.updateWorldMatrix(false, true);
   frontLegs.forEach((leg, index) => place(leg, world[index + 3]));
   applied = true;
  },
  restore() {
   if (!applied) return;
   bones.forEach((bone, index) => bone.position.copy(original[index]));
   applied = false;
  }
 };
}
