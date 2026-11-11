import {PerspectiveCamera, Vector3} from 'three';

// Include the extended forepaws when lying down, in any heading. Keep room
// above/below the pet for the stage controls, rather than testing only its centre.
const FOOTPRINT = .76;
const HEIGHT = .99;
const FAR = -2.9;
const NEAR = .85;
const WIDTH = 1.8;

export function createLanlaoRoamingArea(viewCamera) {
 const camera = viewCamera?.clone() ?? new PerspectiveCamera(35, 724 / 452, .05, 50);
 if (!viewCamera) {
  camera.position.set(-2.33, 1.02, 2.16);
  camera.lookAt(0, .43, 0);
 }
 camera.updateMatrixWorld(true);
 const near = camera.position.clone().setY(0).normalize();
 if (near.lengthSq() === 0) near.set(-2.33, 0, 2.16).normalize();
 const side = new Vector3(near.z, 0, -near.x);
 const projected = new Vector3();
 const at = (depth, lateral = 0) => near.clone().multiplyScalar(depth).addScaledVector(side, lateral);

 function contains(position, clearance = 0) {
  for (let i = 0; i < 16; i++) {
   const angle = i / 16 * Math.PI * 2;
   for (const height of [0, HEIGHT]) {
    // Reserve extra side room for the curved departure from a resting pose.
    projected.copy(position)
     .addScaledVector(near, Math.cos(angle) * (FOOTPRINT + clearance))
     .addScaledVector(side, Math.sin(angle) * (FOOTPRINT + clearance * 2));
    projected.y += height;
    projected.project(camera);
    if (Math.abs(projected.x) > .91 || projected.y < -.85 || projected.y > .70
     || projected.z < -1 || projected.z > 1) return false;
   }
  }
  return true;
 }

 return {
  contains,
  destination(position, random = Math.random, {minDistance = .65} = {}) {
   // The near limit follows the viewport: small screens leave less side room.
   // Sample independent depth bands, not a prescribed far/near alternation.
   let back = FAR, front = NEAR;
   for (let i = 0; i < 12; i++) {
    const middle = (back + front) / 2;
    if (contains(at(middle), .13)) back = middle;
    else front = middle;
   }
   const closest = back;
   const band = Math.floor(random() * 3);
   const low = FAR + (closest - FAR) * band / 3;
   const high = FAR + (closest - FAR) * (band + 1) / 3;
   let furthest=null, furthestDistance=0;
   for (let attempt = 0; attempt < 64; attempt++) {
    const depth = attempt < 40 ? low + random() * (high - low)
     : FAR + random() * (closest - FAR);
    const point = at(depth, (random() * 2 - 1) * WIDTH);
    const distance=point.distanceTo(position);
    if(distance<Math.min(minDistance,1.05)||!contains(point,.13))continue;
    if(distance>=minDistance)return point;
    if(distance>furthestDistance){furthest=point;furthestDistance=distance;}
   }
   // A narrow viewport may not fit the preferred run length. Use the longest
   // safe sampled leg; the shared stopping-distance limit still bounds speed.
   if(furthest)return furthest;
   // A tightly zoomed/rotated view may have no safe new location. Rest there;
   // never teleport the pet or continue retrying forever.
   return null;
  }
 };
}
