import * as THREE from 'three';

// Procedural shell fur: generated at runtime, not baked into the GLB.
// Dark facial features and near-ground surfaces use a conservative heuristic mask.
// A production multi-breed pipeline needs reviewed fur masks, not this heuristic alone.
export function createWebFur(root,{layers=10,length=.014,lanlaoCoat=false}={}){
 const shells=[],materials=[],sources=[];
 const time={value:0},motion={value:0},lengthUniform={value:length};
 let strength=0,enabled=true;
 root.traverse(mesh=>{if(mesh.isSkinnedMesh&&!Array.isArray(mesh.material)&&mesh.material.map&&mesh.geometry.attributes.normal&&mesh.geometry.attributes.uv)sources.push(mesh);});
 for(const source of sources){
  for(let layer=1;layer<=layers;layer++){
   const depth=layer/layers,material=source.material.clone();
   material.name=`WebFur_${layer}`;material.roughness=.95;material.metalness=0;material.side=THREE.FrontSide;
   material.onBeforeCompile=shader=>{
    shader.uniforms.furTime=time;shader.uniforms.furMotion=motion;shader.uniforms.furLength=lengthUniform;shader.uniforms.furDepth={value:depth};
    shader.vertexShader=`uniform float furTime; uniform float furMotion; uniform float furLength; uniform float furDepth; varying float vFurHeight;\n${shader.vertexShader}`;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      vFurHeight = position.y;
      float footMask = smoothstep(0.018, 0.10, position.y);
      float faceMask = mix(0.55, 1.0, smoothstep(-0.42,-0.20,position.x));
      float cheek = (1.0 - smoothstep(-0.39, -0.33, position.x)) *
        smoothstep(0.035, 0.075, abs(position.z)) *
        smoothstep(0.60, 0.64, position.y) * (1.0 - smoothstep(0.70, 0.74, position.y));
      float chest = smoothstep(-0.38, -0.30, position.x) *
        (1.0 - smoothstep(-0.13, -0.07, position.x)) *
        smoothstep(0.22, 0.30, position.y) * (1.0 - smoothstep(0.52, 0.59, position.y)) *
        (1.0 - smoothstep(0.11, 0.17, abs(position.z)));
      float coatRegion = ${lanlaoCoat ? 'max(cheek * 0.65, chest * 0.90)' : '0.0'};
      float strandLength = furLength * footMask * (faceMask + coatRegion);
      vec3 normalFur = normalize(objectNormal);
      vec3 tangentFur = cross(normalFur, abs(normalFur.y)<0.9?vec3(0.,1.,0.):vec3(1.,0.,0.));
      float phase = position.x*17.0 + position.y*11.0 + position.z*13.0;
      float wave = sin(furTime*9.0 - phase - furDepth*1.7);
      vec3 bend = tangentFur * (0.13*sin(phase*2.0+furDepth*3.0)+furMotion*wave*0.24);
      bend *= 1.0 - coatRegion * 0.6;
      bend += vec3(0.,-0.18 - coatRegion * 0.5 - chest * ${lanlaoCoat ? '0.30' : '0.0'},0.)*furDepth;
      transformed += strandLength * (normalFur*furDepth + bend*furDepth*furDepth);
    `);
    shader.fragmentShader=`uniform float furDepth; varying float vFurHeight;
      float furHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\n${shader.fragmentShader}`;
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
      vec2 furCell = vMapUv * 650.0;
      vec2 cellId = floor(furCell);
      vec2 center = vec2(0.2)+0.6*vec2(furHash(cellId),furHash(cellId+37.0));
      float radius = mix(0.47,0.09,furDepth);
      if(length(fract(furCell)-center)>radius) discard;
      if(furHash(cellId+83.0)<furDepth*0.20) discard;
      float pigment = dot(diffuseColor.rgb,vec3(0.2126,0.7152,0.0722));
      if(pigment<0.04 || vFurHeight<0.02) discard;
      diffuseColor.rgb *= mix(0.88,1.0,furDepth);
    `);
   };
   material.customProgramCacheKey=()=> lanlaoCoat ? 'lanlao-web-fur-v3' : 'lanlao-web-fur-v1';
   const shell=new THREE.SkinnedMesh(source.geometry,material);shell.name=`web-fur-${layer}`;
   // The coat must follow the source mesh's animated shape keys as well as its bones.
   if(source.morphTargetInfluences) shell.morphTargetInfluences=source.morphTargetInfluences;
   shell.position.copy(source.position);shell.quaternion.copy(source.quaternion);shell.scale.copy(source.scale);
   shell.bindMode=source.bindMode;shell.bind(source.skeleton,source.bindMatrix);shell.frustumCulled=false;shell.castShadow=false;shell.receiveShadow=false;
   source.parent.add(shell);shells.push(shell);materials.push(material);
  }
 }
 return {
  count:shells.length,
  setEnabled(value){enabled=value;for(const shell of shells)shell.visible=value;},
  setLength(value){lengthUniform.value=THREE.MathUtils.clamp(value,.003,.025);},
  update(dt,mode){const target=({run:1,jump:1.15,walk:.4,come:.4,home:.4,wag:.28})[mode]||0;strength+=(target-strength)*(1-Math.exp(-dt*5));motion.value=strength;if(enabled)time.value+=dt;},
  dispose(){shells.forEach(s=>s.removeFromParent());materials.forEach(m=>m.dispose());}
 };
}
