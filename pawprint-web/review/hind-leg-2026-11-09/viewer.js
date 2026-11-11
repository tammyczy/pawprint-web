import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {createLanlaoPosture as beforePosture} from './before/lanlao-posture.js';
import {createLanlaoStride as beforeStride} from './before/lanlao-stride.js';
import {createLanlaoPosture as afterPosture} from '../../src/lanlao-posture.js';
import {createLanlaoStride as afterStride} from '../../src/lanlao-stride.js';
import {softenLanlaoEarColor} from '../../src/lanlao-ear-color.js';

const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),entries=[];
const up=new THREE.Vector3(0,1,0),view=document.querySelector('#view'),motion=document.querySelector('#motion');
const paws=['Front_L_Paw','Front_R_Paw','Hind_L_Paw','Hind_R_Paw'];
let time=0,speed=0,yaw=0,paused=false,previous=performance.now();
for(const [id,makePosture,makeStride] of [['before',beforePosture,beforeStride],['after',afterPosture,afterStride]]){
 const wrap=document.querySelector(`#${id}`),scene=new THREE.Scene();scene.background=new THREE.Color('#e8e9df');
 const actor=new THREE.Group();scene.add(actor);
 const model=(await loader.loadAsync('/models/lanlao-rig-motion-refined.glb')).scene;actor.add(model);
 model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.frustumCulled=false;for(const m of [o.material].flat()){if(m.normalScale)m.normalScale.set(.4,.4);m.roughness=1;m.metalness=0;}}});softenLanlaoEarColor(model);
 const posture=makePosture(model);let pose;
 const stride=makeStride(model,actor,{applyLocomotion:frame=>{pose=frame;posture.applyLocomotion(frame);}});stride.start();
 const camera=new THREE.PerspectiveCamera(29,wrap.clientWidth/wrap.clientHeight,.05,100);
 const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(1.25);renderer.setSize(wrap.clientWidth,wrap.clientHeight);renderer.shadowMap.enabled=true;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;wrap.append(renderer.domElement);
 scene.add(new THREE.HemisphereLight(0xfffaf2,0xb1afa3,2.4));const sun=new THREE.DirectionalLight(0xfff7ea,2.1);sun.castShadow=true;scene.add(sun,sun.target);const fill=new THREE.DirectionalLight(0xffffff,1.5);fill.position.set(3,2,-2);scene.add(fill);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(2000,2000),new THREE.MeshStandardMaterial({color:'#e8e9df',roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.009;floor.receiveShadow=true;scene.add(floor);
 const grid=new THREE.GridHelper(2000,4000,0xd4d7ce,0xe0e2d9);grid.position.y=-.007;scene.add(grid);
 const markers=[0x1876b9,0x695ac8,0xbc7415,0xc63f4c].map(color=>{const marker=new THREE.Mesh(new THREE.SphereGeometry(.017,10,8),new THREE.MeshBasicMaterial({color,depthTest:false}));marker.renderOrder=10;scene.add(marker);return marker;});
 entries.push({actor,model,posture,stride,reset(){posture.restore();stride.stop();actor.position.set(0,0,0);actor.quaternion.identity();posture.reset();model.updateWorldMatrix(true,true);stride.start();pose=null;},render(dt,turnRate){
  if(dt)stride.update(dt,{speed,turnRate});else if(pose)posture.applyLocomotion(pose);
  const offset=view.value==='rear'?new THREE.Vector3(2.5,.9,1.3):view.value==='front'?new THREE.Vector3(-2.7,.85,.2):new THREE.Vector3(0,.8,2.9);
  offset.applyQuaternion(actor.quaternion);camera.position.copy(actor.position).add(offset);camera.lookAt(actor.position.x,.43,actor.position.z);
  sun.position.copy(actor.position).add(new THREE.Vector3(-3,5,3));sun.target.position.copy(actor.position);
  markers.forEach((m,i)=>model.getObjectByName(paws[i]).getWorldPosition(m.position));
  renderer.render(scene,camera);posture.restore();
  document.querySelector(`#${id}-readout`).textContent=`${speed.toFixed(2)} units/s | ${stride.contacts.map((c,i)=>`${['左前','右前','左后','右后'][i]}:${c?'落地':'摆腿'}`).join(' ')}`;
 }});
}
function reset(){time=speed=yaw=0;entries.forEach(e=>e.reset());}
function advance(dt){
 time+=dt;const section=time%8;
 const target=motion.value==='trot'?1.15:motion.value==='gallop'?2.2:motion.value==='turn'?.65:section<2?1.15:section<4?2.2:section<6?1.0:2.2;
 speed+=THREE.MathUtils.clamp(target-speed,-3.6*dt,3*dt);
 const turnRate=motion.value==='turn'?1.2*Math.sin(time*.65):0;yaw+=turnRate*dt;
 entries.forEach(e=>{e.actor.quaternion.setFromAxisAngle(up,yaw);e.actor.position.add(new THREE.Vector3(-Math.cos(yaw),0,Math.sin(yaw)).multiplyScalar(speed*dt));e.render(dt,turnRate);});
 document.querySelector('#time').textContent=`${time.toFixed(2)} s`;
}
document.querySelector('#pause').onclick=()=>{paused=!paused;document.querySelector('#pause').textContent=paused?'播放':'暂停';};
document.querySelector('#step').onclick=()=>{paused=true;document.querySelector('#pause').textContent='播放';advance(1/60);};
document.querySelector('#reset').onclick=reset;motion.onchange=reset;view.onchange=()=>advance(0);
function render(now){const dt=Math.min((now-previous)/1000,.04)*Number(document.querySelector('#rate').value);previous=now;if(!paused)advance(dt);requestAnimationFrame(render);}requestAnimationFrame(render);
