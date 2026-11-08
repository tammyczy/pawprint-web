import {MathUtils, Vector3} from 'three';

const UP = new Vector3(0, 1, 0);
const WALK_SPEED = .275;
const TROT_SPEED = .865;
const ARRIVAL_DISTANCE = .022;
const LOOP_RADIUS = .48;

function angleDifference(target, current) {
 return MathUtils.euclideanModulo(target - current + Math.PI, 2 * Math.PI) - Math.PI;
}

function approach(current, target, change) {
 return current + MathUtils.clamp(target - current, -change, change);
}

export function createLanlaoLocomotion(dog) {
 let speed = 0;
 let turnRate = 0;
 let loopDirection = 1;
 let followingLoop = false;

 function loopHeading(yaw) {
  const {x, z} = dog.position;
  const radius = Math.hypot(x, z);
  if (radius < .12) return yaw;
  const radialX = x / radius;
  const radialZ = z / radius;
  const correction = MathUtils.clamp((LOOP_RADIUS - radius) * 4.5, -1.4, 1.2);
  const tangentX = -radialZ * loopDirection + radialX * correction;
  const tangentZ = radialX * loopDirection + radialZ * correction;
  const blend = MathUtils.smoothstep(radius, .12, .40);
  const headingX = MathUtils.lerp(-Math.cos(yaw), tangentX, blend);
  const headingZ = MathUtils.lerp(Math.sin(yaw), tangentZ, blend);
  return Math.atan2(headingZ, -headingX);
 }

 return {
  reset() {
   speed = 0;
   turnRate = 0;
   followingLoop = false;
  },
  move(dt, {destination = null, loop = false, run = false, pace = 1, brake = false} = {}) {
   const strideSpeed = run ? TROT_SPEED : WALK_SPEED;
   const {w, y} = dog.quaternion;
   const yaw = Math.atan2(2 * w * y, 1 - 2 * y * y);
   let heading = yaw;
   let distance = Infinity;
   if (loop && !followingLoop) {
    const tangent = dog.position.x * Math.sin(yaw) + dog.position.z * Math.cos(yaw);
    if (Math.abs(tangent) > .05) loopDirection = Math.sign(tangent);
   }
   followingLoop = loop;
   if (!brake && loop) heading = loopHeading(yaw);
   else if (!brake && destination) {
    const x = destination.x - dog.position.x;
    const z = destination.z - dog.position.z;
    distance = Math.hypot(x, z);
    if (distance > ARRIVAL_DISTANCE) heading = Math.atan2(z, -x);
   }
   const error = angleDifference(heading, yaw);
   const maxTurnRate = run ? 2.8 : 2.4;
   const steer = MathUtils.clamp(error * 8, -maxTurnRate, maxTurnRate);
   turnRate = approach(turnRate, steer, 10 * dt);
   const step = turnRate * dt;
   const yawDelta = Math.sign(step) === Math.sign(error)
    ? Math.sign(error) * Math.min(Math.abs(step), Math.abs(error))
    : 0;
   const nextYaw = yaw + yawDelta;
   dog.quaternion.setFromAxisAngle(UP, nextYaw);

   const maxPace = strideSpeed * pace;
   const deceleration = run ? 3.3 : 1.55;
   const targetSpeed = brake || (!destination && !loop) ? 0
    : Math.min(maxPace, Math.sqrt(2 * deceleration * Math.max(0, distance - ARRIVAL_DISTANCE)))
      * MathUtils.lerp(loop ? .48 : .14, 1, Math.max(0, Math.cos(error)) ** 2);
   const previousSpeed = speed;
   speed = approach(speed, targetSpeed, (speed > targetSpeed ? deceleration : run ? 2.6 : 1.3) * dt);
   let travel = (previousSpeed + speed) * dt * .5;
   if (!brake && destination && Math.abs(error) < .18) travel = Math.min(travel, distance);
   dog.position.x -= Math.cos(nextYaw) * travel;
   dog.position.z += Math.sin(nextYaw) * travel;

   const arrived = brake ? speed === 0
    : destination !== null && Math.hypot(destination.x - dog.position.x, destination.z - dog.position.z) <= ARRIVAL_DISTANCE + .002 && speed < .045;
   return {clipRate: dt > 0 ? travel / (strideSpeed * dt) : 0, arrived};
  }
 };
}
