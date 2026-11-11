import {MathUtils, Vector3} from 'three';
import {lanlaoTouchdownPhases as phases,lanlaoStrideLength,lanlaoPawOffset,advanceLanlaoGait} from './lanlao-gait-timing.js';

const UP=new Vector3(0,1,0);
const names=['Front_L_Paw','Front_R_Paw','Hind_L_Paw','Hind_R_Paw'];
const wrap=x=>MathUtils.euclideanModulo(x,1);
const smooth=x=>{x=MathUtils.clamp(x,0,1);return x*x*x*(10+x*(-15+6*x));};
const swingTravel=u=>{const r=.20;return u<r?u*u/(2*r*(1-r)):u>1-r?1-(1-u)**2/(2*r*(1-r)):(u-r*.5)/(1-r);};

export function createLanlaoStride(model,actor,posture) {
 const feet=names.map((name,i)=>{
  const point=model.getObjectByName(name).getWorldPosition(new Vector3());
  return {bind:actor.worldToLocal(point.clone()),gallopReach:i<2?.025:i===2?.085:.105,ground:point.y,phase:wrap(-phases.walk[i]),
   offset:phases.walk[i],duty:.68,stance:true,origin:0,lift:.045,
   anchor:point.clone(),from:point.clone(),to:point.clone(),point:point.clone(),local:new Vector3()};
 });
 const frame={phase:0,walk:1,trot:0,gallop:0,amount:0,turn:0,lean:0,feet:feet.map(f=>f.local),contacts:[true,true,true,true],toes:[0,0,0,0]};
 let active=false,age=0,cycles=0,previousSpeed=0,frequency=0,galloping=false;
 const forward=new Vector3(),prediction=new Vector3(),origin=new Vector3();

 function resetFeet(){
  feet.forEach((foot,i)=>{
   model.getObjectByName(names[i]).getWorldPosition(foot.point);
   foot.anchor.copy(foot.point);foot.from.copy(foot.point);foot.to.copy(foot.point);
   foot.phase=wrap(-phases.walk[i]);foot.offset=phases.walk[i];foot.duty=.68;
   foot.stance=foot.phase<foot.duty;
   foot.origin=foot.stance?foot.duty:foot.phase;
  });
 }

 function landing(foot,speed,turnRate,seconds,ahead){
  actor.getWorldPosition(origin);
  forward.set(-1,0,0).applyQuaternion(actor.quaternion);
  // Predict along the same arc as the root, including the different distance
  // travelled by the inside and outside paws. Grounded anchors never rotate.
  const angle=turnRate*(seconds+ahead);
  prediction.copy(foot.bind);
  // Hind paws collect under the abdomen before pushing back. Using the
  // standing paw position for every gait made fast running look like prancing.
  prediction.x-=foot.gallopReach*frame.gallop;
  prediction.applyAxisAngle(UP,angle).applyQuaternion(actor.quaternion).add(origin);
  const travel=speed*(seconds+ahead);
  if(Math.abs(angle)<.0001)prediction.addScaledVector(forward,travel);
  else{
   prediction.addScaledVector(forward,travel*Math.sin(angle)/angle);
   prediction.addScaledVector(new Vector3(forward.z,0,-forward.x),travel*(1-Math.cos(angle))/angle);
  }
  prediction.y=foot.ground;
  return prediction;
 }

 return {
  get active(){return active;},
  get phase(){return wrap(cycles);},
  get weights(){return {walk:frame.walk,trot:frame.trot,gallop:frame.gallop};},
  get contacts(){return feet.map(f=>f.stance);},
  get targets(){return frame.feet;},
  start(){
   if(active)return;
   active=true;age=0;cycles=0;previousSpeed=0;frequency=0;galloping=false;
   frame.walk=1;frame.trot=frame.gallop=0;frame.turn=frame.lean=0;resetFeet();
  },
  stop(){active=false;},
  update(dt,{speed=0,turnRate=0}={}){
   if(!active||dt<=0)return;
   age+=dt;
   const blend=1-Math.exp(-dt*12);
   const acceleration=MathUtils.clamp((speed-previousSpeed)/dt,-3.6,3);
   // Prepare the next contact pattern while accelerating/braking, before the
   // root has already reached a speed the previous swing cannot comfortably fit.
   const forecastSpeed=Math.max(0,speed+acceleration*.18);
   // Separate entry/exit speeds keep a minor speed change from repeatedly
   // changing the leg order while running through a bend.
   if(forecastSpeed>1.75)galloping=true;
   else if(forecastSpeed<1.35)galloping=false;
   const gallop=galloping?1:0;
   const trot=MathUtils.smoothstep(speed,.38,.72)*(1-gallop);
   const steppingSpeed=Math.hypot(speed,turnRate*.22);
   advanceLanlaoGait(frame,{trot,gallop},steppingSpeed,dt);
   const strideLength=lanlaoStrideLength(frame);
   frequency=steppingSpeed/strideLength;
   const advance=frequency*dt;
   cycles+=advance;
   frame.phase=wrap(cycles);
   frame.amount=smooth(age/.24)*MathUtils.smoothstep(steppingSpeed,0,.18);
   frame.turn+=(MathUtils.clamp(turnRate,-1.7,1.7)-frame.turn)*blend;
   frame.lean+=(MathUtils.clamp(speed*turnRate*.07,-.09,.09)-frame.lean)*blend;
   previousSpeed=speed;

   feet.forEach((foot,i)=>{
    const desiredOffset=lanlaoPawOffset(frame,i);
    const shift=desiredOffset-foot.offset;
    const legFrequency=Math.max(.4,(advance-shift)/dt);
    foot.offset=desiredOffset;
    const oldPhase=foot.phase;
    foot.phase=wrap(foot.phase+advance-shift);
    const duty=.68*frame.walk+.44*frame.trot+(i<2?.23:.22)*frame.gallop;
    const remainingTime=()=>2*(1-foot.phase)/(legFrequency+Math.sqrt(legFrequency**2+2*Math.max(0,acceleration)/strideLength*(1-foot.phase)));
    const lift=.028*frame.walk+.050*frame.trot+(i<2?.075:.090)*frame.gallop;
    if(foot.phase<oldPhase){
     foot.stance=true;foot.anchor.copy(foot.to);foot.anchor.y=foot.ground;foot.duty=duty;
    }
    if(foot.stance)foot.duty+=MathUtils.clamp(duty-foot.duty,-advance*.6,advance*.6);
    const displacement=actor.worldToLocal(foot.anchor.clone()).sub(foot.bind);
    if(foot.stance&&(displacement.x>(i<2?.10:.075)||Math.abs(displacement.z)>.10))foot.duty=Math.min(foot.duty,foot.phase);
    if(foot.stance&&foot.phase>=foot.duty){
     foot.stance=false;foot.origin=foot.phase;foot.from.copy(foot.anchor);foot.lift=lift;
     const remaining=remainingTime();
     const futureSpeed=Math.max(0,speed+acceleration*remaining*.35);
     foot.to.copy(landing(foot,futureSpeed,turnRate,remaining,duty/legFrequency*.45));
    }
    if(foot.stance){foot.point.copy(foot.anchor);frame.toes[i]=0;}
    else{
     const progress=MathUtils.clamp((foot.phase-foot.origin)/(1-foot.origin),0,1);
     const remaining=remainingTime();
     const futureSpeed=Math.max(0,speed+acceleration*remaining*.35);
     // Adapt the landing while in flight, then commit as the paw approaches
     // the floor. Stance contacts remain fixed even during a turn or slowdown.
     if(progress<.8)foot.to.lerp(landing(foot,futureSpeed,turnRate,remaining,duty/legFrequency*.45),1-Math.exp(-dt*18));
     foot.point.lerpVectors(foot.from,foot.to,swingTravel(progress));
     foot.point.y=foot.ground+foot.lift*Math.sin(Math.PI*progress)**2;
     frame.toes[i]=Math.sin(Math.PI*progress)*(.10*frame.trot+.22*frame.gallop)*(i<2?1:-.6);
    }
    foot.local.copy(foot.point);model.worldToLocal(foot.local);
    frame.contacts[i]=foot.stance;
   });
   posture.applyLocomotion(frame);
  }
 };
}

export {phases as lanlaoTouchdownPhases};
