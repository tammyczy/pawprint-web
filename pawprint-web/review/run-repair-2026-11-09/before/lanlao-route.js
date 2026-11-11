import {CubicBezierCurve3, MathUtils, Vector3} from 'three';

// One open excursion, not an orbit. Monotonic progress along the chord keeps
// even an S-shaped route from looping back on itself or circling its target.
export function createLanlaoRoute(start, end, random = Math.random, contains = () => true, {bendScale = 1} = {}) {
 const chord = end.clone().sub(start).setY(0);
 const length = chord.length();
 if (length < .05) return null;
 const side = new Vector3(-chord.z, 0, chord.x).normalize();
 const style = random();
 const bend = style < .25 ? 0 : (random() * 2 - 1) * Math.min(.45, length * .22) * bendScale;
 let first = bend;
 let second = style > .65 ? -bend * (.55 + random() * .45) : bend * (.55 + random() * .45);
 let curve;
 for (let attempt = 0; attempt < 6; attempt++) {
  const p1 = start.clone().addScaledVector(chord, .33).addScaledVector(side, first);
  const p2 = start.clone().addScaledVector(chord, .67).addScaledVector(side, second);
  curve = new CubicBezierCurve3(start.clone(), p1, p2, end.clone());
  // A cubic stays inside its control polygon. Check the full pet footprint at
  // the controls too; near an edge this naturally flattens the curve.
  if (contains(p1) && contains(p2)) break;
  first *= .35; second *= .35;
 }
 return routeFromCurve(curve);
}

function routeFromCurve(curve) {
 curve.arcLengthDivisions = 160;
 const distance = curve.getLength();
 return {
  end:curve.v3.clone(), length:distance,
  sample(travel, point = new Vector3(), tangent = new Vector3()) {
   const fraction = MathUtils.clamp(travel / distance, 0, 1);
   curve.getPointAt(fraction, point);
   curve.getTangentAt(fraction, tangent);
   return {point, tangent, yaw:Math.atan2(tangent.z, -tangent.x)};
  },
  curvature(travel) {
   const from = Math.max(0, travel - .025), to = Math.min(distance, travel + .025);
   const a = curve.getTangentAt(from / distance), b = curve.getTangentAt(to / distance);
   return Math.atan2(a.x * b.z - a.z * b.x, a.dot(b)) / Math.max(.001, to - from);
  }
 };
}

// Preserve the current heading at departure. Ordinary travel changes direction
// through a moving arc instead of stopping for a series of in-place rotations.
export function createLanlaoHeadingRoute(start,end,yaw,contains,{startCurvature=null}={}) {
 const distance=start.distanceTo(end);
 if(distance<.05)return null;
 const difference=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
 const step=.02;
 // Integrate bounded steering in distance space. Unlike a cubic forced to
 // arrive facing backwards, this cannot form a near-zero-radius endpoint cusp.
 for(const maximum of [1.8,3,4.5,6,8])for(const immediate of [false,true]){
  const points=[start.clone()],headings=[yaw];
  let heading=yaw,curvature=startCurvature??0,totalTurn=0,travel=0;
  let current=start.clone();
  for(let i=0;i<400;i++){
   const delta=end.clone().sub(current),remaining=delta.length();
   if(remaining<.07&&travel>.1)return sampledRoute(points,headings,step);
   const error=difference(Math.atan2(delta.z,-delta.x),heading);
   const desired=MathUtils.clamp(error*(maximum<=3?2.8:maximum*1.6),-maximum,maximum);
   const steeringRate=maximum<=3?7:maximum*6;
   curvature=immediate&&i===0?desired:curvature+MathUtils.clamp(desired-curvature,-step*steeringRate,step*steeringRate);
   const change=curvature*step;
   const next=current.clone().add(new Vector3(-Math.cos(heading+change*.5),0,Math.sin(heading+change*.5)).multiplyScalar(step));
   if(!contains(next))break;
   totalTurn+=Math.abs(change);travel+=step;
   if(totalTurn>Math.PI*1.25||travel>distance*1.65+1)break;
   heading+=change;points.push(next);headings.push(heading);current=next;
  }
 }
 return null;
}

function sampledRoute(points,headings,step){
 const length=(points.length-1)*step;
 const curvature=headings.slice(1).map((yaw,i)=>(yaw-headings[i])/step);
 return {
  end:points.at(-1).clone(),length,maxCurvature:Math.max(...curvature.map(Math.abs)),
  sample(distance,point=new Vector3(),tangent=new Vector3()){
   const at=MathUtils.clamp(distance/step,0,points.length-1),i=Math.min(points.length-2,Math.floor(at)),t=at-i;
   point.lerpVectors(points[i],points[i+1],t);
   const yaw=MathUtils.lerp(headings[i],headings[i+1],t);
   tangent.set(-Math.cos(yaw),0,Math.sin(yaw));return {point,tangent,yaw};
  },
  curvature(distance){return curvature[Math.min(curvature.length-1,Math.max(0,Math.floor(distance/step)))];}
 };
}

// Split a large change of heading into small grounded steps. The existing
// four-paw turn pose holds support feet while each swinging paw is repositioned.
export function createLanlaoStepTurn(startYaw, endYaw) {
 const difference = MathUtils.euclideanModulo(endYaw - startYaw + Math.PI, Math.PI * 2) - Math.PI;
 const count = Math.max(1, Math.ceil(Math.abs(difference) / .9));
 const angle = difference / count;
 const duration = .42 + .20 * Math.abs(angle) / .9;
 let time = 0;
 return {
  advance(dt, {stopAfterStep=false}={}) {
   const boundary=Math.min(count,Math.floor(time/duration)+1)*duration;
   time = Math.min(stopAfterStep?boundary:duration*count, time + dt);
   const step = Math.min(count - 1, Math.floor(time / duration));
   const progress = MathUtils.clamp((time - step * duration) / duration, 0, 1);
   const eased = progress * progress * (3 - 2 * progress);
   return {yaw:startYaw + angle * (step + eased), angle, progress,
    stepFinished:time >= boundary - 1e-8,
    done:time >= duration * count};
  }
 };
}
