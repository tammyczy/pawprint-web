import * as THREE from 'three';

// Asset-specific, reversible runtime rebind. Coordinates are measured from
// this model's four paw clusters, not inferred from the broken joint names.
export function footCycle(phase,stride=.065,lift=.024){
 const p=((phase%1)+1)%1,stance=.68;
 if(p<stance)return {z:stride*(p/stance-.5),y:0};
 const t=(p-stance)/(1-stance);
 return {z:stride*(.5-(.5-.5*Math.cos(Math.PI*t))),y:lift*Math.sin(Math.PI*t)**2};
}
export function repairXiaoqWalk(root){
 const meshes=[];root.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o);});
 const rigs=[];
 for(const mesh of meshes){
  const geometry=mesh.geometry.clone(),p=geometry.attributes.position;
  const body=new THREE.Bone();body.name='XQ_Body';
  const feet=[[-.137,-.184,.5],[.056,-.158,0],[-.165,.242,.75],[.023,.278,.25]];
  const bones=[body],legs=[];
  for(const [x,z,phase] of feet){
   const hip=new THREE.Bone(),knee=new THREE.Bone();hip.position.set(x,.27,z);knee.position.set(0,-.135,0);body.add(hip);hip.add(knee);bones.push(hip,knee);legs.push({hip,knee,x,z,phase});
  }
  const head=new THREE.Bone(),tail=new THREE.Bone(),tip=new THREE.Bone();
  head.name='XQ_Head';tail.name='XQ_TailRoot';tip.name='XQ_TailTip';
  head.position.set(.02,.38,-.16);tail.position.set(-.08,.44,.33);tip.position.set(0,.14,.04);
  body.add(head,tail);tail.add(tip);bones.push(head,tail,tip);
  const ids=new Uint16Array(p.count*4),weights=new Float32Array(p.count*4);
  const smooth=(a,b,v)=>THREE.MathUtils.smoothstep(v,a,b);
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
   let nearest=0,distance=Infinity;
   feet.forEach(([fx,fz],j)=>{const d=(x-fx)**2+(z-fz)**2;if(d<distance){nearest=j;distance=d;}});
   const limb=(1-smooth(.14,.33,y))*(1-smooth(.09,.19,Math.sqrt(distance)));
   const lower=1-smooth(.065,.19,y),offset=i*4;
   ids[offset]=0;weights[offset]=1-limb;ids[offset+1]=1+nearest*2;weights[offset+1]=limb*(1-lower);ids[offset+2]=2+nearest*2;weights[offset+2]=limb*lower;
   const headWeight=smooth(.27,.46,y)*(1-smooth(-.23,-.06,z));
   const tailWeight=smooth(.43,.60,y)*smooth(.12,.29,z);
   if(tailWeight>0){const tipWeight=smooth(.58,.76,y)*.65;ids[offset]=0;weights[offset]=1-tailWeight;ids[offset+1]=10;weights[offset+1]=tailWeight*(1-tipWeight);ids[offset+2]=11;weights[offset+2]=tailWeight*tipWeight;}
   else if(headWeight>0){weights[offset]*=1-headWeight;weights[offset+1]*=1-headWeight;weights[offset+2]*=1-headWeight;ids[offset+3]=9;weights[offset+3]=headWeight;}
  }
  geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(ids,4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
  mesh.geometry=geometry;mesh.add(body);root.updateMatrixWorld(true);mesh.bind(new THREE.Skeleton(bones),mesh.matrixWorld);mesh.skeleton.update();mesh.computeBoundingBox();mesh.computeBoundingSphere();
  rigs.push({legs,body,head,tail,tip});
 }
 let phase=0,strength=0,time=0,actionTime=0,previous='stop';
 return {start(mode){previous=mode;actionTime=0;},update(dt,mode){
  if(typeof mode==='boolean')mode=mode?'walk':'stop';
  if(mode!==previous){actionTime=0;previous=mode;}actionTime+=dt;time+=dt;
  const moving=['walk','come','home','run'].includes(mode),running=mode==='run';
  strength=THREE.MathUtils.damp(strength,moving?1:0,8,dt);if(moving)phase+=dt/(running?.5:.95);
  let height=0,tuck=0;
  if(mode==='jump'){
   const t=actionTime;
   if(t<.22){height=-.025*Math.sin(t/.22*Math.PI/2);tuck=-height;}
   else if(t<.82){const u=(t-.22)/.6;height=.19*4*u*(1-u);tuck=.035*Math.sin(Math.PI*u);}
   else if(t<1.1){height=-.025*Math.sin((t-.82)/.28*Math.PI);tuck=-height;}
  }
  for(const {legs,body,head,tail,tip} of rigs){
   body.position.y=THREE.MathUtils.damp(body.position.y,height+(running?.008*Math.sin(phase*Math.PI*4):0),18,dt);
   head.rotation.y=THREE.MathUtils.damp(head.rotation.y,mode==='wag'?.12*Math.sin(time*1.7):0,6,dt);
   tail.rotation.y=THREE.MathUtils.damp(tail.rotation.y,mode==='wag'?.38*Math.sin(time*8):moving?.07*Math.sin(time*5):0,12,dt);
   tip.rotation.z=THREE.MathUtils.damp(tip.rotation.z,mode==='wag'?.17*Math.sin(time*8-.6):0,12,dt);
   for(const [index,leg] of legs.entries()){
   const offset=running?[0,.5,.5,0][index]:leg.phase;
   const foot=footCycle(phase+offset,running?.11:.065,running?.045:.024),z=foot.z*strength,y=foot.y*strength+tuck;
   // Two-link sagittal IK: never stretches the limb beyond its rest length.
   const down=.27-y,distance=Math.min(.27,Math.hypot(down,z));
   const bend=Math.acos(THREE.MathUtils.clamp(distance/.27,0,1));
   const aim=Math.atan2(-z,down);
   leg.hip.rotation.x=aim+bend;leg.knee.rotation.x=-2*bend;
   }
  }
  return {finished:mode==='jump'&&actionTime>=1.15};
 }};
}
