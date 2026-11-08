import * as THREE from 'three';

// Lightweight tapered ribbons. UVs retain the source coat colors and the four
// strongest interpolated bone influences keep the fibers attached while walking.
export function createStrandFur(root,{count=14000,length=.028}={}){
 const sources=[];root.traverse(o=>{if(o.isSkinnedMesh&&!o.name.startsWith('web-fur')&&!Array.isArray(o.material)&&o.material.map)sources.push(o);});
 const objects=[],time={value:0},motion={value:0};let seed=731,enabled=true;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(const source of sources){
  const g=source.geometry,p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv,si=g.attributes.skinIndex,sw=g.attributes.skinWeight;
  if(!n||!uv||!si||!sw)continue;
  const idx=g.index,triCount=(idx?idx.count:p.count)/3,cumulative=[],a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();let area=0;
  const vi=i=>idx?idx.getX(i):i;
  for(let t=0;t<triCount;t++){a.fromBufferAttribute(p,vi(t*3));b.fromBufferAttribute(p,vi(t*3+1));c.fromBufferAttribute(p,vi(t*3+2));area+=b.sub(a).cross(c.sub(a)).length()*.5;cumulative.push(area);}
  const positions=[],normals=[],uvs=[],indices=[],weights=[],faces=[];
  const point=new THREE.Vector3(),normal=new THREE.Vector3(),tmp=new THREE.Vector3(),side=new THREE.Vector3(),tip=new THREE.Vector3();
  for(let s=0;s<count;s++){
   let lo=0,hi=triCount-1,target=random()*area;while(lo<hi){const mid=(lo+hi)>>1;if(cumulative[mid]<target)lo=mid+1;else hi=mid;}
   const ids=[vi(lo*3),vi(lo*3+1),vi(lo*3+2)],r=Math.sqrt(random()),blend=[1-r,r*(1-random()),0];blend[2]=1-blend[0]-blend[1];
   point.set(0,0,0);normal.set(0,0,0);let u=0,v=0;const bones=new Map();
   ids.forEach((id,k)=>{point.addScaledVector(tmp.fromBufferAttribute(p,id),blend[k]);normal.addScaledVector(tmp.fromBufferAttribute(n,id),blend[k]);u+=uv.getX(id)*blend[k];v+=uv.getY(id)*blend[k];for(let j=0;j<4;j++){const bone=si.getComponent(id,j);bones.set(bone,(bones.get(bone)||0)+sw.getComponent(id,j)*blend[k]);}});
   if(point.y<.04)continue;normal.normalize();
   const influences=[...bones].sort((x,y)=>y[1]-x[1]).slice(0,4);while(influences.length<4)influences.push([0,0]);const total=influences.reduce((sum,x)=>sum+x[1],0)||1;
   side.crossVectors(normal,Math.abs(normal.y)<.9?new THREE.Vector3(0,1,0):new THREE.Vector3(1,0,0)).normalize();
   const strandLength=length*(.6+random()*.8),width=length*.018,base=positions.length/3,phase=random()*Math.PI*2;
   for(let segment=0;segment<4;segment++){
    const d=segment/3;tip.copy(point).addScaledVector(normal,strandLength*d);tip.y-=strandLength*.3*d*d;tip.addScaledVector(side,Math.sin(phase)*strandLength*.16*d*d);
    for(const sign of [-1,1]){tmp.copy(tip).addScaledVector(side,sign*width*(1-d*.97));positions.push(tmp.x,tmp.y,tmp.z);normals.push(normal.x,normal.y,normal.z);uvs.push(u,v);for(const [bone,weight]of influences){indices.push(bone);weights.push(weight/total);}}
    if(segment<3){const q=base+segment*2;faces.push(q,q+1,q+2,q+1,q+3,q+2);}
   }
  }
  const geometry=new THREE.BufferGeometry();for(const [name,array,size]of [['position',positions,3],['normal',normals,3],['uv',uvs,2],['skinWeight',weights,4]])geometry.setAttribute(name,new THREE.Float32BufferAttribute(array,size));geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));geometry.setIndex(faces);
  const material=source.material.clone();material.normalMap=null;material.side=THREE.DoubleSide;material.roughness=1;material.metalness=0;
  material.onBeforeCompile=shader=>{shader.uniforms.strandTime=time;shader.uniforms.strandMotion=motion;shader.vertexShader='uniform float strandTime;uniform float strandMotion;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n transformed.x += sin(strandTime*8.0+position.y*33.0+position.z*21.0)*strandMotion*0.0015;');shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n if(dot(diffuseColor.rgb,vec3(0.2126,0.7152,0.0722))<0.13) discard;');};
  material.customProgramCacheKey=()=> 'colored-strand-fur-v1';
  const hair=new THREE.SkinnedMesh(geometry,material);hair.name='colored-strand-fur';hair.position.copy(source.position);hair.quaternion.copy(source.quaternion);hair.scale.copy(source.scale);hair.bindMode=source.bindMode;hair.bind(source.skeleton,source.bindMatrix);hair.frustumCulled=false;source.parent.add(hair);objects.push(hair);
 }
 return {count:objects.length,setEnabled(value){enabled=value;objects.forEach(o=>o.visible=value);},update(dt,mode){if(enabled)time.value+=dt;motion.value=THREE.MathUtils.damp(motion.value,mode==='stop'?0:1,5,dt);},dispose(){objects.forEach(o=>{o.removeFromParent();o.geometry.dispose();o.material.dispose();});}};
}
