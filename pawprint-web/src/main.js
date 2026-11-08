import './style.css';
import './speech.css';
import './i18n.css';
import './app-polish.css';
import {createIcons,PawPrint,ArrowUpRight,Mic,Hand,Footprints,Zap,Waves,Rabbit,CircleStop,RotateCcw,ArrowDownRight,ArrowDownToLine,ArrowUpFromLine} from 'lucide';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { respond } from './companion.js';
import { createAIChat } from './ai-chat.js';
import { createConversationStatus } from './conversation-status.js';
import { createVoicePanel } from './voice-ui.js';
import { createWebFur } from './web-fur.js';
import {softenLanlaoEarColor} from './lanlao-ear-color.js';
import {initI18n,tr,locale} from './i18n.js';
import {createCare} from './care.js';
import {createLanlaoIdle} from './lanlao-idle.js';
import {createLanlaoBlink} from './lanlao-blink.js';
import {createLanlaoPosture} from './lanlao-posture.js';
import {lanlaoJumpDuration} from './lanlao-jump.js';
import {createLanlaoLocomotion} from './lanlao-locomotion.js';
import {createLanlaoGaitContacts} from './lanlao-gait-contacts.js';
import {createLanlaoAttention,createLanlaoGreeting} from './lanlao-attention.js';
import {createLanlaoExpression} from './lanlao-expression.js';
import {createLanlaoPetting} from './lanlao-petting.js';
import {parseCommand} from './commands.js';

const webFurMode=new URLSearchParams(location.search).get('fur')==='web';
let webFur, idle, eyelids, posture, gaitContacts, expression, petBody;
const attention=createLanlaoAttention();
const greeting=createLanlaoGreeting(attention);
let queuedMove=null, brakingCommand=null, gaitSettle=0, quietTime=0, nextActivity=2.1, automaticRest=false;
let playCount=0, gestureTime=0, gestureDepth=0, gestureLook=0, gestureExit=null;
let greetingPhase='look', greetingLandingAge, greetingPlayful=false;
let greetingQueued=false, peelSide=1, landingCommand=null;
let groundedActionTime=0, turnStart=0, turnAngle=0;
const verticalAxis=new THREE.Vector3(0,1,0);
const gestureViewer=new THREE.Vector3();
const isGesture=()=>mode==='bow'||mode==='greeting';
const autonomousGaits=new Set(['explore','dash','approach','peel']);
const movingCommands=new Set(['come','home','walk','run']);
const isAutonomousGait=()=>autonomousGaits.has(mode);
const isLocomoting=()=>movingCommands.has(mode)||isAutonomousGait();
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
let stageVisible=false, stageWidth=0, stageHeight=0, bubbleHeight=0;
let pettingTime=0, petHoverTime=0, petHover=false, petHoverTriggered=false, lastPetHit=0, petMesh, petSide=0;

const $=s=>document.querySelector(s), wrap=$('#canvas-wrap');
new IntersectionObserver(([entry])=>{stageVisible=entry.isIntersecting;}).observe(wrap);
const state=$('#state'),reply=$('#reply'),mic=$('#mic'),greetButton=$('#greet-lanlao');
const bubble=document.createElement('div');bubble.id='dog-speech';bubble.hidden=true;bubble.setAttribute('role','status');bubble.setAttribute('aria-live','polite');
const bubbleName=document.createElement('span');bubbleName.className='dog-speech-name';bubbleName.textContent='Lanlao';
const bubbleText=document.createElement('div');bubbleText.className='dog-speech-text';bubbleText.textContent='I’m here! Say hello.';bubble.append(bubbleName,bubbleText);document.querySelector('.stage').append(bubble);
function showSpeech(text){bubbleText.textContent=text.replace(/^(蓝老|Lanlao|Lanlao|蓝老)[：:]\s*/,'');}
new MutationObserver(()=>showSpeech(reply.textContent)).observe(reply,{childList:true,characterData:true,subtree:true});
let speechHead=null;const speechPosition=new THREE.Vector3();
const studioLink=document.querySelector('#studio-link')||document.createElement('a');studioLink.href='/studio.html';if(!studioLink.isConnected)document.querySelector('header').append(studioLink);
const furLink=document.querySelector('#fur-link')||document.createElement('a');furLink.href=webFurMode?'/app.html':'/app.html?fur=web';if(!furLink.isConnected)document.querySelector('.intro').append(furLink);
if(webFurMode){
 document.title='Lanlao · Animated web fur preview';
 const box=document.createElement('div');box.style.cssText='margin-top:18px;padding:14px;background:#e7ecdf;border-radius:12px;font-size:12px;line-height:1.7';
 const title=document.createElement('b');title.textContent='Preview: original GLB colors + live web fur';
 const toggle=document.createElement('button');toggle.id='fur-toggle';toggle.textContent='Web fur: on (compare)';toggle.disabled=true;toggle.style.cssText='display:block;margin:10px 0;padding:9px;border:1px solid #bdc9b1;background:#fafbf5;border-radius:7px;cursor:pointer';let active=true;toggle.onclick=()=>{active=!active;webFur?.setEnabled(active);toggle.textContent=`Web fur: ${active?'on':'off'} (compare)`;};
 const label=document.createElement('label');label.textContent='Fluff length ';const slider=document.createElement('input');slider.type='range';slider.min='3';slider.max='25';slider.value='9';slider.setAttribute('aria-label','Fluff length');slider.oninput=()=>webFur?.setLength(Number(slider.value)/1000);label.append(slider);
 const note=document.createElement('small');note.textContent='Fur is generated on the web, not stored in the GLB. Original animations remain; individual hairs are not physically simulated.';note.style.display='block';box.append(title,toggle,label,note);document.querySelector('.intro').append(box);
}
const settingsContent=document.querySelector('.settings-content');
const dialogueNote=document.createElement('small');dialogueNote.textContent='Checking AI conversation…';dialogueNote.style.display='block';document.querySelector('.voice-box').append(dialogueNote);
const conversationStatus=createConversationStatus();
const renderConversationStatus=()=>{dialogueNote.textContent=tr(conversationStatus.key);};
fetch('/api/health',{signal:AbortSignal.timeout(8000)}).then(r=>{if(!r.ok)throw new Error('Health check failed');return r.json();}).then(data=>{conversationStatus.health(data.conversation==='openai');renderConversationStatus();voicePlayback.setAvailable(data.speech==='openai');}).catch(()=>{conversationStatus.healthFailed();renderConversationStatus();voicePlayback.setAvailable(false);});
const languageLabel=document.createElement('label');languageLabel.textContent='Speech language ';const languageSelect=document.createElement('select');for(const [value,label] of [['en-US','English'],['zh-CN','中文'],['fr-FR','Français'],['es-ES','Español'],['de-DE','Deutsch'],['ja-JP','日本語'],['ko-KR','한국어']]){const option=document.createElement('option');option.value=value;option.textContent=label;languageSelect.append(option);}languageLabel.append(languageSelect);document.querySelector('.voice-box').append(languageLabel);
settingsContent.append(languageLabel);
const voicePlayback=createVoicePanel({container:settingsContent,locale,beforeSpeak:()=>recognition?.abort()});
let ready=false;
const voiceLocales={zh:'zh-CN',en:'en-US',fr:'fr-FR'};
const lucideIcons={PawPrint,ArrowUpRight,Mic,Hand,Footprints,Zap,Waves,Rabbit,CircleStop,RotateCcw,ArrowDownRight,ArrowDownToLine,ArrowUpFromLine};
const renderIcons=()=>createIcons({icons:lucideIcons,attrs:{'stroke-width':1.7}});
const care=createCare({locale,petName:()=>tr('brand'),petKey:'lanlao',controls:document.querySelector('.controls'),stage:document.querySelector('.stage'),onGoodbye:line=>{if(!ready)return;voicePlayback.stop();execute('wag',true);setTimeout(()=>execute('home',true),2600);reply.textContent=`${tr('brand')}: ${line}`;}});
initI18n('home',()=>{care.render();languageSelect.value=voiceLocales[locale()];languageLabel.firstChild.textContent=tr('speechLanguage');voicePlayback.render();renderConversationStatus();const studioText=[...studioLink.childNodes].find(n=>n.nodeType===Node.TEXT_NODE);if(studioText)studioText.textContent=tr('createPet')+' ';else studioLink.prepend(document.createTextNode(tr('createPet')+' '));furLink.textContent=tr(webFurMode?'furBack':'furTry');bubbleName.textContent=tr('brand');if(ready){state.textContent=tr('stateReady');reply.textContent=`${tr('brand')}: ${tr('hello')}`;}for(const button of document.querySelectorAll('[data-command]')){const label=button.querySelector('span');if(label)label.textContent=tr(button.dataset.command);const hint=button.querySelector('small');if(hint)hint.textContent=tr(`hint_${button.dataset.command}`);}renderIcons();});
let renderer,mixer,model,activeAction,finishedAction,mode='stop',destination=null;
const actions={},rest=[],morphWeights=[],home=new THREE.Vector3(0,0,0);
const scene=new THREE.Scene();scene.background=new THREE.Color('#e8e9df');
const camera=new THREE.PerspectiveCamera(35,1,.05,50);
// The rig faces -X. Start closer to its front so looking at the viewer takes a small turn.
camera.position.set(-2.33,1.02,2.16);
try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});}
catch(e){$('#loading').innerHTML='<b>This browser cannot display 3D right now.</b><span>Enable hardware acceleration or try a browser with WebGL support.</span>';throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
wrap.append(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,.43,0);controls.enableDamping=true;controls.enablePan=false;controls.minDistance=1.5;controls.maxDistance=5;controls.maxPolarAngle=Math.PI/2-.04;
controls.saveState();$('#reset-view').onclick=()=>{attention.disengage();controls.reset();};
greetButton.onclick=()=>engageViewer('button');
const canvas=renderer.domElement;
const petRaycaster=new THREE.Raycaster();
const petPointer=new THREE.Vector2();
let tapStart=null;
canvas.addEventListener('pointermove',event=>{
 if(event.pointerType!=='mouse'||event.buttons!==0||tapStart||!ready||!stageVisible||!petMesh)return;
 if(event.timeStamp-lastPetHit<80)return;
 lastPetHit=event.timeStamp;
 const rect=canvas.getBoundingClientRect();
 petPointer.set((event.clientX-rect.left)/rect.width*2-1,1-(event.clientY-rect.top)/rect.height*2);
 petRaycaster.setFromCamera(petPointer,camera);
 const hit=petRaycaster.intersectObject(petMesh,false)[0];
 const onDog=!!hit;
 canvas.style.cursor=onDog?'pointer':'';
 if(!onDog){
  petHover=false;
  petHoverTime=0;
  petHoverTriggered=false;
  return;
 }
 petHover=true;
 petSide=THREE.MathUtils.clamp(model.worldToLocal(hit.point.clone()).z/.12,-1,1);
 if(petHoverTriggered && mode==='stop' && posture.ready && !queuedMove){
  if(!pettingTime)state.textContent=tr('petting');
  pettingTime=1.2;
  quietTime=0;
  nextActivity=3;
 }
});
canvas.addEventListener('pointerleave',()=>{
 canvas.style.cursor='';
 petHover=false;petHoverTime=0;petHoverTriggered=false;
 pettingTime=0;
 if(state.textContent===tr('petting'))state.textContent=tr('stateReady');
});

canvas.addEventListener('pointerdown',event=>{
 petHover=false;petHoverTime=0;petHoverTriggered=false;pettingTime=0;
 if(state.textContent===tr('petting'))state.textContent=tr('stateReady');
 if(!event.isPrimary||event.button!==0){tapStart=null;return;}
 tapStart={id:event.pointerId,x:event.clientX,y:event.clientY,time:event.timeStamp};
});
canvas.addEventListener('pointermove',event=>{
 if(tapStart?.id===event.pointerId&&Math.hypot(event.clientX-tapStart.x,event.clientY-tapStart.y)>8){
  tapStart=null;
  attention.disengage();
 }
});
canvas.addEventListener('pointerup',event=>{
 const press=tapStart;
 tapStart=null;
 if(press?.id===event.pointerId&&event.timeStamp-press.time<700
  &&Math.hypot(event.clientX-press.x,event.clientY-press.y)<=8)engageViewer('canvas');
});
canvas.addEventListener('pointercancel',()=>{tapStart=null;});
canvas.addEventListener('wheel',()=>attention.disengage(),{passive:true});
function engageViewer(source){
 if(!ready||!stageVisible)return;
 if(reducedMotion.matches){
  if(source==='canvas'||source==='button'){
   bubble.hidden=false;
   reply.textContent=`${tr('brand')}: ${tr('hello')}`;
  }
  return;
 }
 if(!attention.engage(source))return;
 if(mode==='stop'&&posture.current==='stand'&&posture.ready&&!queuedMove&&source!=='voice')state.textContent=tr('greetingLook');
}
scene.add(new THREE.HemisphereLight(0xfffaf2,0xb1afa3,2.4));
const sun=new THREE.DirectionalLight(0xfff7ea,2.1);sun.position.set(-3,5,3);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-3;sun.shadow.camera.right=3;sun.shadow.camera.top=3;sun.shadow.camera.bottom=-3;sun.shadow.normalBias=.025;scene.add(sun);
const fill=new THREE.DirectionalLight(0xffffff,1.5);fill.position.set(3,2,-2);scene.add(fill);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#e8e9df',roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.009;ground.receiveShadow=true;scene.add(ground);
const dog=new THREE.Group();scene.add(dog);
const locomotion=createLanlaoLocomotion(dog);
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
loader.load(`${import.meta.env.BASE_URL}models/lanlao-rig-hip-refined.glb`,gltf=>{
 model=gltf.scene;dog.add(model);
 model.traverse(o=>{if(o.isSkinnedMesh && !petMesh)petMesh=o;});
 speechHead=model.getObjectByName('Head');
 idle=createLanlaoIdle(model);
 expression=createLanlaoExpression(model);
 petBody=createLanlaoPetting(model);
 posture=createLanlaoPosture(model);
 gaitContacts=createLanlaoGaitContacts(model);
 eyelids=createLanlaoBlink(model,`${import.meta.env.BASE_URL}models/lanlao-eye-coat.png`);
 model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=false;o.frustumCulled=false;for(const material of [o.material].flat()){if(material.normalScale)material.normalScale.set(.4,.4);material.metalness=0;material.roughness=1;}}if(o.morphTargetInfluences)morphWeights.push(o.morphTargetInfluences);if(o.isBone)rest.push({o,p:o.position.clone(),q:o.quaternion.clone(),s:o.scale.clone()});});
 mixer=new THREE.AnimationMixer(model);
 webFur=createWebFur(model,{layers:matchMedia('(max-width:760px)').matches?6:8,length:.009,lanlaoCoat:true});
 softenLanlaoEarColor(model);
 if(webFurMode){$('#fur-toggle').disabled=webFur.count===0;document.querySelector('footer>span:last-child').textContent='Web fur preview · Original colors and four animations';}
 for(const clip of gltf.animations)actions[clip.name]=mixer.clipAction(clip);
 const required=['Walk_Refined','Run_Trot_Natural','Tail_Wag_Natural'];
 if(required.some(n=>!actions[n])){fail('The model is missing required animations. Please use the included Lanlao GLB.');return;}
 mixer.addEventListener('finished',e=>{if(e.action===activeAction)finishedAction=e.action;});
 ready=true;greetButton.disabled=false;$('#loading').classList.add('hidden');document.querySelectorAll('[data-command],#send').forEach(b=>b.disabled=false);
 mic.disabled=!Recognition;state.textContent=tr('stateReady');reply.textContent=`${tr('brand')}: ${tr('hello')}`;bubble.hidden=false;
},e=>{if(e.total)$('#progress').textContent=`Loading · ${Math.round(e.loaded/e.total*100)}%`;},()=>fail('The model could not load. Please refresh and check that models/lanlao.glb is present.'));
function fail(message){$('#loading').innerHTML='';const b=document.createElement('b');b.textContent=message;$('#loading').append(b);state.textContent='Loading failed';}
function play(name,once=false){
 const next=actions[name];if(activeAction===next&&next.isRunning())return;
 const previous=activeAction;gaitContacts.reset();next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1);next.setLoop(once?THREE.LoopOnce:THREE.LoopRepeat,once?1:Infinity);next.clampWhenFinished=once;next.play();
 if(previous&&previous!==next){
  if(isGaitAction(previous)&&isGaitAction(next)){
   const walkToTrot=next===actions.Run_Trot_Natural;
   const phase=previous.time/previous.getClip().duration+(walkToTrot?.52:-.52);
   next.time=THREE.MathUtils.euclideanModulo(phase,1)*next.getClip().duration;
  }
  previous.fadeOut(.22);
  next.fadeIn(.22);
 }else if(!previous)next.fadeIn(.16);
 activeAction=next;
}
function isGaitAction(action){
 return action&&(action===actions.Walk_Refined||action===actions.Run_Trot_Natural);
}
function stopGait(){
 locomotion.reset();
 gaitContacts.reset();
 if(!activeAction)return;
 if(isGaitAction(activeAction)){
  posture.beginGaitSettle();
  posture.restore();
  mixer.stopAllAction();activeAction=null;return;
 }
 const pose=rest.map(({o})=>[o.position.clone(),o.quaternion.clone(),o.scale.clone()]);
 mixer.stopAllAction();
 activeAction=null;
 rest.forEach(({o},i)=>{
  o.position.copy(pose[i][0]);o.quaternion.copy(pose[i][1]);o.scale.copy(pose[i][2]);
 });
 gaitSettle=.28;
}
function startMove(command){
 mode=command;
 if(command==='jump'){
  groundedActionTime=0;
 }else if(command==='come'||command==='home'){
  destination=command==='home'?home.clone():new THREE.Vector3(camera.position.x,0,camera.position.z).normalize().multiplyScalar(.85);
  play('Walk_Refined');
 }else play({walk:'Walk_Refined',run:'Run_Trot_Natural',wag:'Tail_Wag_Natural'}[command],command==='wag');
}
function updateRestControl(){
 const button=$('#rest-command');
 const command=posture.target==='stand'?'stop':'stand';
 if(button.dataset.command===command)return;
 button.dataset.command=command;
 button.querySelector('span').textContent=tr(command);
 button.querySelector('small').textContent=tr(`hint_${command}`);
 const icon=document.createElement('i');
 icon.dataset.lucide=command==='stand'?'arrow-up-from-line':'circle-stop';
 button.firstElementChild.replaceWith(icon);
 renderIcons();
}
function announceCommand(command,quiet){
 updateRestControl();
 const label=tr(`action_${command}`);
 state.textContent=label;
 if(!quiet)reply.textContent=`${tr('brand')}: ${label}.`;
 document.querySelectorAll('[data-command]').forEach(button=>{
  const selected=button.dataset.command===command;
  button.classList.toggle('active',selected);
  button.setAttribute('aria-pressed',String(selected));
 });
}
function execute(command,quiet=false){
 if(!ready)return;
 if(!quiet)commandVersion++;
 attention.disengage();
 pettingTime=0;
 if(mode==='jump'||mode==='turn'){
  if(!quiet)announceCommand(command,false);
  landingCommand=[command,true];
  return;
 }
 if(isGesture()){
  if(!quiet)announceCommand(command,false);
  endGesture([command,true]);
  return;
 }
 bubble.hidden=false;
 automaticRest=false;greetingQueued=false;queuedMove=null;quietTime=0;playCount=0;nextActivity=10;
 if(isLocomoting()&&!movingCommands.has(command)&&!reducedMotion.matches){
  brakingCommand=command;
  announceCommand(command,quiet);
  return;
 }
 applyCommand(command,quiet);
}
function applyCommand(command,quiet){
 brakingCommand=null;
 destination=null;
 if(command==='jump')stopGait();
 const resting=command==='sit'||command==='lie'||command==='stand'||command==='stop';
 if(resting){
  stopGait();mode='stop';
  posture.set(command==='sit'||command==='lie'?command:'stand');
 }else if(!posture.ready||posture.current!=='stand'||gaitSettle>0){
  posture.set('stand');mode='stop';queuedMove=command;
 }else startMove(command);
 announceCommand(command,quiet);
}
function startAutonomousGait(dash){
 const viewer=dog.worldToLocal(camera.position.clone());
 const turn=Math.abs(viewer.z)>.5?Math.sign(viewer.z):(Math.random()<.5?-1:1);
 const direction=new THREE.Vector3(-1,0,turn*(dash?.55:.36)).applyQuaternion(dog.quaternion).normalize();
 destination=dog.position.clone().addScaledVector(direction,dash?.61:.34);
 if(destination.lengthSq()>.62*.62)destination.setLength(.62);
 if(destination.distanceToSquared(dog.position)<.14*.14)destination.copy(dog.position).lerp(home,.8);
 mode=dash?'dash':'explore';
 state.textContent=tr(dash?'action_run':'findingRestSpot');
 play(dash?'Run_Trot_Natural':'Walk_Refined');

}
function startGreetingApproach(){
 const toward=camera.position.clone().sub(dog.position).setY(0).normalize();
 destination=dog.position.clone().addScaledVector(toward,.38).clampLength(0,.61);
 mode='approach';
 state.textContent=tr('action_come');
 bubble.hidden=true;
 play('Walk_Refined');

}
function choosePeelSide(){
 const toward=camera.position.clone().sub(dog.position).setY(0).normalize();
 const tangent=new THREE.Vector3(toward.z,0,-toward.x);
 const lateral=tangent.dot(dog.position);
 return Math.abs(lateral)<.06?(Math.random()<.5?-1:1):-Math.sign(lateral);
}
function startGreetingTurn(){
 const toward=camera.position.clone().sub(dog.position);
 const facing=Math.atan2(toward.z,-toward.x);
 const {w,y}=dog.quaternion;
 turnStart=Math.atan2(2*w*y,1-2*y*y);
 const delta=Math.atan2(Math.sin(facing-turnStart),Math.cos(facing-turnStart));
 const turn=greetingPlayful?1.13:.83;
 turnAngle=THREE.MathUtils.clamp(delta+peelSide*turn,-1.135,1.135);
 groundedActionTime=0;
 mode='turn';
 state.textContent=tr('greetingTurn');
}
function startPeelAway(){
 const forward=new THREE.Vector3(-1,0,0).applyQuaternion(dog.quaternion);
 const radial=dog.position.dot(forward);
 const available=-radial+Math.sqrt(Math.max(0,radial*radial+.67*.67-dog.position.lengthSq()));
 destination=dog.position.clone().addScaledVector(forward,THREE.MathUtils.clamp(available,0,greetingPlayful?.29:.22));
 mode='peel';
 play('Walk_Refined');

}
function animateGroundedAction(dt, canPlay){
 groundedActionTime+=dt;
 if(mode==='turn'){
  const progress=Math.min(1,groundedActionTime/.68);
  dog.quaternion.setFromAxisAngle(verticalAxis,turnStart+turnAngle*ease(progress));
  if(progress<1){posture.applyGreetingTurn(progress,turnAngle);return;}
 }else if(groundedActionTime<lanlaoJumpDuration){
  posture.applyJump(groundedActionTime);
  return;
 }
 const command=landingCommand;
 landingCommand=null;
 if(mode==='turn'&&!command&&canPlay)startPeelAway();
 else{
  mode='stop';
  if(command)execute(...command);
  else finishActivity();
 }
}
function landApproach(){
 destination=null;
 mode='stop';
 stopGait();
 greetingQueued=true;
}
function finishActivity(restHere=false){
 destination=null;
 greetingQueued=false;
 mode='stop';
 stopGait();
 if(restHere){
  automaticRest=true;
  nextActivity=quietTime+12+Math.random()*5;
  posture.set('lie');
  updateRestControl();
  $('#rest-command').classList.remove('active');
  $('#rest-command').setAttribute('aria-pressed','false');
  bubble.hidden=true;
  state.textContent=tr('action_lie');
 }else{
  nextActivity=Math.max(nextActivity,quietTime+4+Math.random()*3);
  state.textContent=tr('stateReady');
 }
}
function endGesture(command=null){
 if(gestureExit){gestureExit.command=command;return;}
 gestureExit={depth:gestureDepth,look:gestureLook,time:0,command};
}
function ease(value){
 const t=THREE.MathUtils.clamp(value,0,1);
 return t*t*(3-2*t);
}
const playBowEnd=.74;
function popAt(time,start,peak,release,end){
 return ease((time-start)/(peak-start))*(1-ease((time-release)/(end-release)));
}
function startGesture(name){
 mode=name;
 gestureTime=0;gestureDepth=0;gestureLook=0;gestureExit=null;
 bubble.hidden=true;
 if(name==='greeting'){
  greeting.reset();
  greetingPhase='look';greetingPlayful=false;greetingLandingAge=undefined;
  peelSide=choosePeelSide();
 }
 state.textContent=tr(name==='greeting'?'greetingLook':'playBow');
}
function animateGesture(dt,interrupted){
 if(interrupted&&!gestureExit)endGesture();
 gestureTime+=dt;
 let turnIntent=0;
 if(gestureExit){
  greetingLandingAge=undefined;
  gestureExit.time+=dt;
  const remaining=1-ease(gestureExit.time/.21);
  gestureDepth=gestureExit.depth*remaining;
  gestureLook=gestureExit.look*remaining;
  if(gestureExit.time>=.21){
   const command=gestureExit.command;
   gestureExit=null;
   finishActivity();
   if(command)execute(...command);
   return;
  }
 }else if(mode==='greeting'){
  const beat=greeting.sample(gestureTime);
  gestureDepth=beat.depth;gestureLook=beat.look;turnIntent=beat.turnIntent;
  greetingPlayful=beat.playful;
  greetingLandingAge=beat.landingAge;
  if(beat.phase!==greetingPhase){
   greetingPhase=beat.phase;
   state.textContent=tr(beat.phase==='pop'?'greetingPaws':'greetingLook');
  }
  if(beat.done){startGreetingTurn();return;}
 }else{
  gestureDepth=popAt(gestureTime,0,.28,.36,playBowEnd);
  if(gestureTime>=playBowEnd){startAutonomousGait(true);return;}
 }
 dog.worldToLocal(gestureViewer.copy(camera.position));
 const yaw=Math.atan2(gestureViewer.z,-gestureViewer.x);
 const glance=THREE.MathUtils.clamp(yaw,-.56,.56)*(1-THREE.MathUtils.smoothstep(Math.abs(yaw),1.22,1.88));
 if(mode==='greeting'){
  posture.applyGreetingPop(gestureDepth,gestureLook*glance+turnIntent*peelSide*.27,gestureLook);
 }else posture.applyPlayBow(gestureDepth,gestureTime,glance);
}
function updateAutonomy(){
 if(mode!=='stop'||!posture.ready||gaitSettle>0||queuedMove)return;
 if(greetingQueued){
  greetingQueued=false;
  startGesture('greeting');
  return;
 }
 const engaged=attention.fresh;
 if(!engaged&&quietTime<nextActivity)return;
 if(automaticRest){
  automaticRest=false;
  playCount=0;
  posture.set('stand');
  updateRestControl();
  state.textContent=tr('action_stand');
  nextActivity=quietTime+(engaged?.25:3);
 }else if(posture.current==='stand'){
  if(engaged||playCount===0){playCount=1;startGreetingApproach();}
  else if(playCount===1){playCount++;startGesture('bow');}
  else startAutonomousGait(false);
 }
}
const askAI=createAIChat();let answering=false, commandVersion=0;
async function accept(text){if(answering)return;quietTime=0;nextActivity=10;greetingQueued=false;bubble.hidden=false;const careReply=care.check(text);if(careReply){voicePlayback.stop();execute('stop',true);reply.textContent=`${tr('brand')}: ${careReply}`;$('#command-text').value='';return;}voicePlayback.stop();
 const action=parseCommand(text,{postures:true});
 if(!action)engageViewer('text');
 if(['sit','lie','stand'].includes(action)){execute(action);$('#command-text').value='';care.noteActivity();return;}
 const requestVersion=commandVersion;
 answering=true;$('#send').disabled=true;reply.textContent=`${tr('brand')}: ${tr('thinking')}`;
 try{const answer=await askAI(text);if(requestVersion!==commandVersion)return;if(answer.action)execute(answer.action);reply.textContent=`${tr('brand')}: ${answer.caption}`;void voicePlayback.speak(answer.caption);conversationStatus.succeeded();renderConversationStatus();$('#command-text').value='';}
 catch(error){if(requestVersion!==commandVersion)return;const answer=respond(text,locale());if(answer.action)execute(answer.action);reply.textContent=`${tr('brand')}: ${answer.caption}`;void voicePlayback.speak(answer.caption);conversationStatus.failed();renderConversationStatus();}
 finally{answering=false;$('#send').disabled=!ready;care.noteActivity();}}
document.querySelectorAll('[data-command]').forEach(b=>b.onclick=()=>{voicePlayback.stop();execute(b.dataset.command);if(b.dataset.command!=='stop')void voicePlayback.speak(tr(`action_${b.dataset.command}`)+'.');});
$('#command-form').onsubmit=e=>{e.preventDefault();const v=$('#command-text').value.trim();if(v)accept(v);};

// Explicit, one-utterance microphone sessions. No background listening or audio storage.
const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
let recognition,listening=false,voiceError=false;
if(!Recognition)$('#voice-status').textContent='Voice recognition is unavailable here. Use the buttons or type instead.';
mic.setAttribute('aria-pressed','false');
mic.onclick=()=>{
 if(!Recognition||!ready)return;
 if(listening){recognition.stop();return;}
 voicePlayback.stop();
 recognition=new Recognition();recognition.lang=languageSelect.value;recognition.continuous=false;recognition.interimResults=true;recognition.maxAlternatives=1;voiceError=false;
 recognition.onstart=()=>{listening=true;engageViewer('voice');mic.setAttribute('aria-pressed','true');mic.classList.add('listening');mic.textContent=tr('listening');$('#voice-status').textContent=tr('listening');showSpeech(tr('listening'));};
 recognition.onresult=e=>{for(let i=e.resultIndex;i<e.results.length;i++){const t=e.results[i][0].transcript;$('#voice-status').textContent=`${tr('heard')}${t}`;if(e.results[i].isFinal)accept(t);}};
 recognition.onerror=e=>{voiceError=true;const errors={'not-allowed':'Microphone access was not granted. Allow it in your browser and try again.','audio-capture':'No microphone is available. Check your device.','network':'Speech recognition could not connect. Please type or use a button.','no-speech':'I didn’t catch that. Try again.','service-not-allowed':'Speech recognition is unavailable here. Please type or use a button.','aborted':'Listening stopped.'};$('#voice-status').textContent=errors[e.error]||`Voice is unavailable (${e.error}). Please type or use a button.`;};
 recognition.onend=()=>{listening=false;mic.setAttribute('aria-pressed','false');mic.classList.remove('listening');mic.innerHTML=tr('micStart');renderIcons();if(!voiceError)$('#voice-status').textContent=tr('micStatus');};
 try{recognition.start();}catch{listening=false;$('#voice-status').textContent='Voice could not start. Please try again or type instead.';}
};
document.addEventListener('visibilitychange',()=>{
 if(document.hidden){attention.disengage();tapStart=null;if(recognition)recognition.abort();voicePlayback.stop();}
});
reducedMotion.addEventListener('change',()=>attention.disengage());
new ResizeObserver(([entry])=>{
 const {width,height}=entry.contentRect;
 if(!width||!height)return;
 stageWidth=width;
 stageHeight=height;
 renderer.setSize(width,height);
 camera.aspect=width/height;
 camera.updateProjectionMatrix();
}).observe(wrap);
new ResizeObserver(()=>{bubbleHeight=bubble.offsetHeight;}).observe(bubble);
let lastTime=performance.now();
renderer.setAnimationLoop(now=>{
 const elapsed=Math.max(0,(now-lastTime)/1000);
 const dt=Math.min(elapsed,.05);
 lastTime=now;
 if(document.hidden)return;
 controls.update();
 attention.advance(elapsed,{available:stageVisible&&ready&&!reducedMotion.matches});
 if(petHover && !petHoverTriggered && mode==='stop' && posture.ready && !queuedMove && ready){
  petHoverTime+=elapsed;
  if(petHoverTime>=.35){
   petHoverTriggered=true;
   pettingTime=1.2;
   quietTime=0;
   nextActivity=3;
   state.textContent=tr('petting');
  }
 }
 if(pettingTime>0){
  pettingTime=Math.max(0,pettingTime-elapsed);
  if(pettingTime===0 && state.textContent===tr('petting'))state.textContent=tr('stateReady');
 }
 const canPlay=stageVisible&&!reducedMotion.matches&&!listening&&!answering;
 if(ready){
  if(isAutonomousGait()&&!canPlay&&!brakingCommand)finishActivity();
  let arrived=false;
  if(isLocomoting()){
   const run=mode==='run'||mode==='dash';
   const pace=mode==='dash'?.8:mode==='approach'?1.25:mode==='peel'?(greetingPlayful?1.25:.9):1;
   const travel=locomotion.move(dt,{destination,loop:mode==='walk'||mode==='run',
    run,pace,brake:!!brakingCommand});
   if(isGaitAction(activeAction))activeAction.setEffectiveTimeScale(travel.clipRate);
   arrived=travel.arrived;
  }
  mixer.update(dt);
  if(finishedAction){
   const completed=finishedAction;
   finishedAction=null;
   if(completed===activeAction)execute('stop',true);
  }
  if(isLocomoting()&&isGaitAction(activeAction)){
   posture.applyGaitContacts(gaitContacts.update({
    run:activeAction===actions.Run_Trot_Natural,
    weight:activeAction.getEffectiveWeight()
   }));
  }
  if(arrived){
   if(brakingCommand)applyCommand(brakingCommand,true);
   else if(mode==='approach')landApproach();
   else if(isAutonomousGait())finishActivity(mode==='explore');
   else applyCommand('stop',true);
  }
  if(webFur)webFur.update(dt,mode);
  if(mode==='stop'){
   if(gaitSettle>0){
    gaitSettle=Math.max(0,gaitSettle-dt);
    const blend=gaitSettle===0?1:1-Math.exp(-dt*16);
    for(const r of rest){r.o.position.lerp(r.p,blend);r.o.quaternion.slerp(r.q,blend);r.o.scale.lerp(r.s,blend);}
   }
   const decay=Math.exp(-dt*12);
   for(const weights of morphWeights)for(let i=0;i<weights.length;i++)weights[i]*=decay;
  }
 }
 if(ready){
  if(canPlay&&!petHover){quietTime+=dt;updateAutonomy();}
  if(mode==='turn'||mode==='jump')animateGroundedAction(dt,canPlay);
  else if(isGesture())animateGesture(dt,!canPlay);
  else if(mode==='wag'&&!reducedMotion.matches)posture.applyTailWag();
  if(mode==='stop'&&gaitSettle===0){
   const activeStage=stageVisible||!automaticRest;
   posture.apply(activeStage?dt:0,{snap:reducedMotion.matches&&!automaticRest});
   if(posture.ready&&queuedMove){const command=queuedMove;queuedMove=null;startMove(command);}
   if(posture.ready&&mode==='stop')idle.apply(dt,{visible:stageVisible,reduced:reducedMotion.matches,
    listening:listening||answering,camera:camera.position,body:dog,posture:posture.current});
   else idle.settle();
  }else idle.settle();
  petBody.apply(dt,{active:pettingTime>0,available:mode==='stop'&&posture.ready&&gaitSettle===0&&stageVisible&&!reducedMotion.matches,side:petSide});
  expression.apply(dt,{mode,visible:stageVisible,reduced:reducedMotion.matches,engaged:attention.recent,
   listening:listening||answering,body:dog,camera:camera.position,gestureDepth,gestureTime,gestureLook,
   jumpTime:groundedActionTime,greetingLandingAge,petting:pettingTime>0,
   gaitPhase:isGaitAction(activeAction)?activeAction.time/activeAction.getClip().duration:undefined});
  eyelids.value=Math.max(idle.blink,expression.blink);
 }
 if(stageVisible)renderer.render(scene,camera);
 if(ready&&stageVisible&&!bubble.hidden){
  if(speechHead){speechHead.getWorldPosition(speechPosition);speechPosition.y+=.31;}else{dog.getWorldPosition(speechPosition);speechPosition.y+=1.0;}
  speechPosition.project(camera);
  const half=Math.min(142,(stageWidth-32)/2);
  const x=THREE.MathUtils.clamp((speechPosition.x*.5+.5)*stageWidth,half+12,stageWidth-half-12);
  const y=THREE.MathUtils.clamp((-.5*speechPosition.y+.5)*stageHeight,bubbleHeight+58,stageHeight-56);
  bubble.style.transform=`translate3d(${x}px,${y}px,0) translate(-50%,-100%)`;
 }
 expression?.restore();
 petBody?.restore();
 idle?.restore();
 posture?.restore();
});

import './design-system.css';

import './experience.js';
