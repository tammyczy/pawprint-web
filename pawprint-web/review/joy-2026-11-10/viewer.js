import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {createLanlaoPosture as beforePosture} from './before/lanlao-posture.js';
import {createLanlaoExpression as beforeExpression} from './before/lanlao-expression.js';
import {createLanlaoIdle as beforeIdle} from './before/lanlao-idle.js';
import {createLanlaoBlink as beforeBlink} from './before/lanlao-blink.js';
import {createLanlaoPosture as afterPosture} from '../../src/lanlao-posture.js';
import {createLanlaoExpression as afterExpression} from '../../src/lanlao-expression.js';
import {createLanlaoIdle as afterIdle} from '../../src/lanlao-idle.js';
import {createLanlaoBlink as afterBlink} from '../../src/lanlao-blink.js';
import {softenLanlaoEarColor} from '../../src/lanlao-ear-color.js';
import {createWebFur} from '../../src/web-fur.js';

const motion=document.querySelector('#motion'),view=document.querySelector('#view'),entries=[];
let time=0,paused=false,previous=performance.now();
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
for(const [id,makePosture,makeExpression,makeIdle,makeBlink] of [
 ['before',beforePosture,beforeExpression,beforeIdle,beforeBlink],
 ['after',afterPosture,afterExpression,afterIdle,afterBlink]]){
 const wrap=document.querySelector('#'+id),scene=new THREE.Scene();scene.background=new THREE.Color('#e8e9df');
 const actor=new THREE.Group();scene.add(actor);
 const gltf=await loader.loadAsync('/models/lanlao-rig-motion-refined.glb'),model=gltf.scene;actor.add(model);
 model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=false;o.frustumCulled=false;for(const m of [o.material].flat()){m.normalScale?.set(.4,.4);m.roughness=1;m.metalness=0;}}});
 let posture=makePosture(model),expression=makeExpression(model),idle=makeIdle(model,()=>.5);
 const blink=makeBlink(model,'/models/lanlao-eye-coat.png');
 const fur=createWebFur(model,{layers:6,length:.009,lanlaoCoat:true});softenLanlaoEarColor(model);
 const mixer=new THREE.AnimationMixer(model),action=mixer.clipAction(gltf.animations.find(a=>a.name==='Tail_Wag_Natural'));
 const camera=new THREE.PerspectiveCamera(35,1,.05,50);
 const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(1.5);renderer.shadowMap.enabled=true;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;wrap.append(renderer.domElement);
 scene.add(new THREE.HemisphereLight(0xfffaf2,0xb1afa3,2.4));
 const sun=new THREE.DirectionalLight(0xfff7ea,2.1);sun.position.set(-3,5,3);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.normalBias=.025;scene.add(sun);
 const fill=new THREE.DirectionalLight(0xffffff,1.5);fill.position.set(3,2,-2);scene.add(fill);
 if(id==='after'){const faceFill=new THREE.DirectionalLight(0xffffff,.35);faceFill.position.set(-4,1.4,2.2);faceFill.target.position.set(-.3,.7,0);scene.add(faceFill,faceFill.target);}
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#e8e9df',roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.009;floor.receiveShadow=true;scene.add(floor);
 function framing(){
  const close=view.value==='face';camera.position.copy(close?new THREE.Vector3(-1.16,.85,.43):view.value==='rear'?new THREE.Vector3(1.45,.85,1.4):new THREE.Vector3(-1.65,.95,1.65));
  camera.lookAt(close?new THREE.Vector3(-.35,.71,0):new THREE.Vector3(0,.43,0));
  camera.aspect=wrap.clientWidth/wrap.clientHeight;camera.updateProjectionMatrix();renderer.setSize(wrap.clientWidth,wrap.clientHeight);
 }
 framing();new ResizeObserver(framing).observe(wrap);
 entries.push({reset(){mixer.stopAllAction();posture.reset();idle=makeIdle(model,()=>.5);expression=makeExpression(model);},render(dt){
  const local=time%6,duration=action.getClip().duration,wagging=motion.value==='wag'&&local<duration;
  if(wagging){action.reset().setEffectiveWeight(1).play();mixer.setTime(local);posture.applyTailWag();}
  else{mixer.stopAllAction();posture.apply(0);idle.apply(dt,{visible:true,reduced:false,listening:false,camera:camera.position,body:actor,posture:'stand'});}
  expression.apply(dt,{mode:wagging?'wag':'stop',visible:true,reduced:false,body:actor,camera:camera.position,engaged:motion.value==='attention'});
  blink.value=Math.max(idle.blink,expression.blink);fur.update(dt,wagging?'wag':'stop');
  renderer.render(scene,camera);expression.restore();idle.restore();posture.restore();
 },framing});
}
function reset(){time=0;entries.forEach(e=>e.reset());}
motion.onchange=reset;view.onchange=()=>entries.forEach(e=>e.framing());
document.querySelector('#pause').onclick=()=>{paused=!paused;document.querySelector('#pause').textContent=paused?'播放':'暂停';};
document.querySelector('#reset').onclick=reset;
function render(now){const dt=Math.min(.04,(now-previous)/1000);previous=now;if(!paused)time+=dt;entries.forEach(e=>e.render(paused?0:dt));document.querySelector('#time').textContent=time.toFixed(2)+' s';requestAnimationFrame(render);}requestAnimationFrame(render);
