// Touchdowns in FL, FR, HL, HR order. A common unwrapped phase space prevents
// interpolation from taking a different route around the cycle for each paw.
// Gallop: HL → HR → FR → FL, with separate hind contacts.
// HR lives in the following cycle for walk/trot. Blending its equivalent 0
// phase toward gallop would cross HL, briefly making both hind paws hop together.
export const lanlaoTouchdownPhases={walk:[0,.5,.75,1.25],trot:[0,.5,.5,1],gallop:[.04,.88,.40,.58]};
export const lanlaoGallopCollectionPhase=.32;
export function lanlaoStrideLength({walk,trot,gallop}){
 return .28*walk+.50*trot+.80*gallop;
}
export function lanlaoPawOffset(weights,leg){
 return lanlaoTouchdownPhases.walk[leg]*weights.walk
  +lanlaoTouchdownPhases.trot[leg]*weights.trot
  +lanlaoTouchdownPhases.gallop[leg]*weights.gallop;
}

// Move the trunk, landing reach and all four phase offsets through the same
// transition. Bound the common blend by the largest paw phase change, so no
// paw cycle runs backwards and existing stance contacts remain anchored.
export function advanceLanlaoGait(weights,{trot,gallop},steppingSpeed,dt){
 const blend=1-Math.exp(-dt*12);
 const candidate={trot:weights.trot+(trot-weights.trot)*blend,
  gallop:weights.gallop+(gallop-weights.gallop)*blend};
 candidate.walk=1-candidate.trot-candidate.gallop;
 const advance=steppingSpeed/Math.max(lanlaoStrideLength(weights),lanlaoStrideLength(candidate))*dt;
 const largest=Math.max(...[0,1,2,3].map(i=>Math.abs(lanlaoPawOffset(candidate,i)-lanlaoPawOffset(weights,i))));
 const fraction=largest>0?Math.min(1,advance*.45/largest):1;
 weights.trot+=(candidate.trot-weights.trot)*fraction;
 weights.gallop+=(candidate.gallop-weights.gallop)*fraction;
 weights.walk=1-weights.trot-weights.gallop;
}
