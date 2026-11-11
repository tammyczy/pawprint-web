import {MathUtils, Vector3} from 'three';

const UP = new Vector3(0, 1, 0);
// Calibrated root travel per second of each authored clip, in model units.
// Cruise pace can change; these must stay fixed so feet follow actual travel.
const WALK_SPEED = .275;
const TROT_SPEED = .865;
const ARRIVAL_DISTANCE = .022;
export const LANLAO_TURN_RATE_LIMIT = 1.6;

function angleDifference(target, current) {
 return MathUtils.euclideanModulo(target - current + Math.PI, 2 * Math.PI) - Math.PI;
}
function approach(current, target, change) {
 return current + MathUtils.clamp(target - current, -change, change);
}

export function createLanlaoLocomotion(dog) {
 let speed = 0, turnRate = 0, path = null, progress = 0;
 const previousPosition = new Vector3();

 return {
  reset() {speed = 0; turnRate = 0; path = null; progress = 0;},
  move(dt, {destination = null, route = null, nextRoute = null, run = false, pace = 1, brake = false, exitSpeed = 0,
   faceBeforeMoving = false, faceOnArrival = null} = {}) {
   if (dt <= 0) return {clipRate:0, arrived:false, speed, turnRate:0};
   const strideSpeed = run ? TROT_SPEED : WALK_SPEED;
   const {w,y} = dog.quaternion;
   const yaw = Math.atan2(2*w*y, 1-2*y*y);
   const deceleration = run ? 3.6 : 1.25;
   const acceleration = run ? 3.0 : 1.0;
   if (route) {
    if (path !== route) {path = route; progress = 0;}
    const remaining = route.length-progress;
    // Preview curvature so the body slows before a bend, not after yaw changes.
    const lookAhead = Math.max(.20, speed*speed/(2*deceleration)+.15);
    const curvature = Math.max(...Array.from({length:9},(_,i)=>{
     const at=progress+i/8*lookAhead;
     return Math.abs(at>route.length&&nextRoute?nextRoute.curvature(at-route.length):route.curvature(Math.min(route.length,at)));
    }));
    const targetSpeed = brake ? 0 : Math.min(strideSpeed*pace, LANLAO_TURN_RATE_LIMIT/Math.max(.001,curvature),
     Math.sqrt(exitSpeed**2+2*deceleration*Math.max(0,remaining-(exitSpeed?0:ARRIVAL_DISTANCE))));
    const previousSpeed = speed;
    speed = approach(speed,targetSpeed,(speed>targetSpeed?deceleration:acceleration)*dt);
    previousPosition.copy(dog.position);
    progress = Math.min(route.length,progress+(speed+previousSpeed)*.5*dt);
    const frame = route.sample(progress);
    dog.position.copy(frame.point);
    dog.quaternion.setFromAxisAngle(UP,frame.yaw);
    turnRate = angleDifference(frame.yaw,yaw)/dt;
    const travel = dog.position.distanceTo(previousPosition);
    return {clipRate:travel/(strideSpeed*dt),speed,turnRate,
     arrived:brake?speed===0:exitSpeed>0?progress>=route.length:route.length-progress<=ARRIVAL_DISTANCE+.002&&speed<.045};
   }

   // Direct approaches (come/home) retain a steering controller. Roaming and
   // explicit walk/run commands use open routes; there is no circular fallback.
   path = null;
   let heading = yaw, distance = Infinity;
   if (brake && speed === 0) turnRate = 0;
   if (!brake && destination) {
    const x=destination.x-dog.position.x,z=destination.z-dog.position.z;
    distance=Math.hypot(x,z);
    if (distance>ARRIVAL_DISTANCE) heading=Math.atan2(z,-x);
    else if(faceOnArrival)heading=Math.atan2(faceOnArrival.z-dog.position.z,dog.position.x-faceOnArrival.x);
   }
   if (brake) heading=yaw+turnRate*.16;
   const error=angleDifference(heading,yaw);
   const maxTurnRate=faceBeforeMoving?1.65:run?1.25:2.4;
   turnRate=approach(turnRate,MathUtils.clamp(error*8,-maxTurnRate,maxTurnRate),(run?3:10)*dt);
   const step=turnRate*dt;
   const yawDelta=Math.sign(step)===Math.sign(error)?Math.sign(error)*Math.min(Math.abs(step),Math.abs(error)):0;
   const nextYaw=yaw+yawDelta;
   dog.quaternion.setFromAxisAngle(UP,nextYaw);
   const turnPace=run?1/(1+Math.abs(turnRate)*.24):1;
   const alignment=faceBeforeMoving?MathUtils.smoothstep(Math.cos(error),Math.cos(.30),Math.cos(.06))
    :MathUtils.lerp(.14,1,Math.max(0,Math.cos(error))**2);
   const targetSpeed=brake||!destination?0:Math.min(strideSpeed*pace,
    Math.sqrt(2*deceleration*Math.max(0,distance-ARRIVAL_DISTANCE)))
    *turnPace*alignment;
   const previousSpeed=speed;
   speed=approach(speed,targetSpeed,(speed>targetSpeed?deceleration:acceleration)*dt);
   let travel=(previousSpeed+speed)*dt*.5;
   if (!brake&&destination&&Math.abs(error)<.18) travel=Math.min(travel,distance);
   dog.position.x-=Math.cos(nextYaw)*travel;dog.position.z+=Math.sin(nextYaw)*travel;
   return {clipRate:travel/(strideSpeed*dt),speed,turnRate:yawDelta/dt,
    arrived:brake?speed===0:destination!==null&&dog.position.distanceTo(destination)<=ARRIVAL_DISTANCE+.002&&speed<.045
     &&(!faceOnArrival||Math.abs(angleDifference(Math.atan2(faceOnArrival.z-dog.position.z,dog.position.x-faceOnArrival.x),nextYaw))<.012)};
  }
 };
}
