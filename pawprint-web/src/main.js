import {clearSubmittedInput} from './input-completion.js';
import './style.css';
import './speech.css';
import './i18n.css';
import './app-polish.css';
import './memory-card.css';
import {createIcons,PawPrint,ArrowUpRight,Mic,Hand,Footprints,Zap,Waves,Rabbit,CircleStop,RotateCcw,ArrowDownRight,ArrowDownToLine,ArrowUpFromLine} from 'lucide';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { respond } from './companion.js';
import { createAIChat } from './ai-chat.js';
import { createConversationStatus } from './conversation-status.js';
import {directPetCommand} from './direct-pet-command.js';
import {recognitionStatus,bindRecognitionErrors,createRecognitionWatchdog} from './recognition-status.js';
import { createWebFur } from './web-fur.js';
import {softenLanlaoEarColor} from './lanlao-ear-color.js';
import {initI18n,tr,locale} from './i18n.js';
import {createCare,detectDistress} from './care.js';
import {isImmediateStop} from './immediate-stop.js';
import {createMemoryCard} from './memory-card.js';
import {loadWithIdleTimeout} from './pet-load-timeout.js';
import {createLanlaoViewerFailure,guardLanlaoInput} from './lanlao-viewer-failure.js';
import {createLanlaoIdle} from './lanlao-idle.js';
import {createLanlaoBlink} from './lanlao-blink.js';
import {createLanlaoPosture} from './lanlao-posture.js';
import {lanlaoJumpDuration} from './lanlao-jump.js';
import {createLanlaoLocomotion,LANLAO_TURN_RATE_LIMIT} from './lanlao-locomotion.js';
import {createLanlaoAutonomy} from './lanlao-autonomy.js';
import {createLanlaoRoamingArea} from './lanlao-roaming-area.js';
import {createLanlaoStride} from './lanlao-stride.js';
import {planLanlaoRequestedTravel} from './lanlao-travel-view.js';
import {planLanlaoApproach,LANLAO_APPROACH_FOCUS_HEIGHT} from './lanlao-approach.js';
import {createLanlaoAttention,createLanlaoGreeting} from './lanlao-attention.js';
import {createLanlaoExpression} from './lanlao-expression.js';
import {createLanlaoPetting,createPettingRequest} from './lanlao-petting.js';
import {parseCommand} from './commands.js';

const webFurMode=new URLSearchParams(location.search).get('fur')==='web';
let webFur, idle, eyelids, posture, stride, expression, petBody;
const attention=createLanlaoAttention();
const greeting=createLanlaoGreeting(attention);
let queuedMove=null, brakingCommand=null, gaitSettle=0, quietTime=0, nextActivity=7+Math.random()*5, automaticRest=false;
const autonomy=createLanlaoAutonomy(Math.random,()=>createLanlaoRoamingArea(camera));
let autonomousPace=1;
let activeRoute=null,onwardTravel=null,queuedMoveDelay=0;
let travelViewTarget=null,travelFocusTarget=null,pendingTravelStart=null,approachView=false,approachCameraMove=null,closeGreetingTime=0;
const normalViewTarget=new THREE.Vector3(0,.43,0),approachFocus=new THREE.Vector3();
let pendingQuietActivity=null;
let quietRestDuration=null;
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
const facingYaw=()=>Math.atan2(2*dog.quaternion.w*dog.quaternion.y,1-2*dog.quaternion.y**2);
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
let stageVisible=false, stageWidth=0, stageHeight=0, bubbleHeight=0;
let pettingTime=0, petHoverTime=0, petHover=false, petHoverTriggered=false, lastPetHit=0, petMesh, petSide=0;

const $=s=>document.querySelector(s), wrap=$('#canvas-wrap'),stage=wrap.closest('.stage');
new IntersectionObserver(([entry])=>{stageVisible=entry.isIntersecting;}).observe(wrap);
const state=$('#state'),reply=$('#reply'),mic=$('#mic'),greetButton=$('#greet-lanlao'),petButton=$('#pet-lanlao');
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
let conversationNeedsLogin=false;
const renderConversationStatus=()=>{
 dialogueNote.textContent=tr(conversationStatus.key);
 if(conversationNeedsLogin&&conversationStatus.key==='conversationUnavailable'){
  const link=document.createElement('a');
  link.href=`/studio.html?lang=${locale()}`;
  link.textContent=tr('conversationLogin');
  dialogueNote.replaceChildren(link);
 }
};
fetch('/api/health',{signal:AbortSignal.timeout(8000)}).then(r=>{if(!r.ok)throw new Error('Health check failed');return r.json();}).then(data=>{conversationStatus.health(data.conversation==='openai');renderConversationStatus();voicePlayback.setAvailable(data.speech==='openai');}).catch(()=>{conversationStatus.healthFailed();renderConversationStatus();voicePlayback.setAvailable(false);});
const languageLabel=document.createElement('label');languageLabel.textContent='Speech language ';const languageSelect=document.createElement('select');for(const [value,label] of [['en-US','English'],['zh-CN','中文'],['fr-FR','Français'],['es-ES','Español'],['de-DE','Deutsch'],['ja-JP','日本語'],['ko-KR','한국어']]){const option=document.createElement('option');option.value=value;option.textContent=label;languageSelect.append(option);}languageLabel.append(languageSelect);document.querySelector('.voice-box').append(languageLabel);
const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
let recognition,voiceErrorCode=Recognition?null:'unsupported';
// Lanlao responds through movement; no human-sounding narration on this page.
const voicePlayback={stop(){},render(){},setAvailable(){},speak(){}};
let ready=false;
const voiceLocales={zh:'zh-CN',en:'en-US',fr:'fr-FR'};
const lucideIcons={PawPrint,ArrowUpRight,Mic,Hand,Footprints,Zap,Waves,Rabbit,CircleStop,RotateCcw,ArrowDownRight,ArrowDownToLine,ArrowUpFromLine};
const renderIcons=()=>createIcons({icons:lucideIcons,attrs:{'stroke-width':1.7}});
const care=createCare({locale,petName:()=>tr('brand'),petKey:'lanlao',controls:document.querySelector('#support-actions'),stage:document.querySelector('.stage'),onGoodbye:line=>{if(!ready)return;commandVersion++;cancelPending();const version=commandVersion;voicePlayback.stop();execute('wag',true);setTimeout(()=>{if(ready&&version===commandVersion)execute('home',true);},2600);reply.textContent=`${tr('brand')}: ${line}`;conversationStatus.local();renderConversationStatus();}});
const memoryCard=createMemoryCard({container:document.querySelector('#memory-card'),locale});
const viewerFailure=createLanlaoViewerFailure({loading:$('#loading'),state,locale,reload:()=>location.reload(),document});
function fail(code){ready=false;greetButton.disabled=true;petButton.disabled=true;mic.disabled=true;document.querySelectorAll('[data-command],#send').forEach(button=>button.disabled=true);bubble.hidden=true;viewerFailure.show(code);}
initI18n('home',()=>{care.render();memoryCard.render();languageSelect.value=voiceLocales[locale()];languageLabel.firstChild.textContent=tr('speechLanguage');voicePlayback.render();renderConversationStatus();if(voiceErrorCode)$('#voice-status').textContent=recognitionStatus(voiceErrorCode,locale());const studioText=[...studioLink.childNodes].find(n=>n.nodeType===Node.TEXT_NODE);if(studioText)studioText.textContent=tr('createPet')+' ';else studioLink.prepend(document.createTextNode(tr('createPet')+' '));furLink.textContent=tr(webFurMode?'furBack':'furTry');bubbleName.textContent=tr('brand');if(ready){state.textContent=tr('stateReady');reply.textContent=`${tr('brand')}: Hi, Josh.`;}for(const button of document.querySelectorAll('[data-command]')){const label=button.querySelector('span');if(label)label.textContent=tr(button.dataset.command);const hint=button.querySelector('small');if(hint)hint.textContent=tr(`hint_${button.dataset.command}`);}renderIcons();viewerFailure.render();});
let renderer,mixer,model,activeAction,finishedAction,mode='stop',destination=null;
const actions={},rest=[],morphWeights=[],home=new THREE.Vector3(0,0,0);
const scene=new THREE.Scene();scene.background=new THREE.Color('#e8e9df');
const camera=new THREE.PerspectiveCamera(35,1,.05,50);
// The rig faces -X. Start closer to its front so looking at the viewer takes a small turn.
camera.position.set(-2.33,1.02,2.16);
try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});}
catch(e){fail('webgl');throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
wrap.append(renderer.domElement);
let contextLost=false,stopRenderActivity=()=>{};
renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();contextLost=true;renderer.setAnimationLoop(null);stopRenderActivity();fail('context');});
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,.43,0);controls.enableDamping=true;controls.enablePan=false;controls.minDistance=1.5;controls.maxDistance=5;controls.maxPolarAngle=Math.PI/2-.04;
controls.saveState();$('#reset-view').onclick=()=>{attention.disengage();approachView=false;approachCameraMove=null;controls.reset();};
controls.addEventListener('start',()=>{approachView=false;approachCameraMove=null;});
greetButton.onclick=()=>engageViewer('button');
petButton.onclick=createPettingRequest({
 getState:()=>({ready,visible:stageVisible,mode,postureReady:posture?.ready,queuedMove,gaitSettle}),
 onWait:()=>{state.textContent=tr('petWait');},
 // The existing expression and torso controllers already honour reduced motion.
 // Repeated deliberate presses extend the same gentle response, without stacking it.
 onPet:duration=>{attention.disengage();petSide=0;pettingTime=duration;quietTime=0;nextActivity=3;state.textContent=tr('petting');}
});
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
   reply.textContent=`${tr('brand')}: Hi, Josh.`;
  }
  return;
 }
 if(!attention.engage(source))return;
 if(mode==='stop'&&posture.current==='stand'&&posture.ready&&!queuedMove&&source!=='voice')state.textContent=tr('greetingLook');
}
scene.add(new THREE.HemisphereLight(0xfffaf2,0xb1afa3,2.4));
const sun=new THREE.DirectionalLight(0xfff7ea,2.1);sun.position.set(-3,5,3);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-3;sun.shadow.camera.right=3;sun.shadow.camera.top=3;sun.shadow.camera.bottom=-3;sun.shadow.normalBias=.025;scene.add(sun);
const fill=new THREE.DirectionalLight(0xffffff,1.5);fill.position.set(3,2,-2);scene.add(fill);
const faceFill=new THREE.DirectionalLight(0xffffff,.35);faceFill.position.set(-4,1.4,2.2);faceFill.target.position.set(-.3,.7,0);scene.add(faceFill,faceFill.target);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#e8e9df',roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.009;ground.receiveShadow=true;scene.add(ground);
const dog=new THREE.Group();scene.add(dog);
const locomotion=createLanlaoLocomotion(dog);
const manager=new THREE.LoadingManager();
const loader=new GLTFLoader(manager).setMeshoptDecoder(MeshoptDecoder);
loadWithIdleTimeout({start:(resolve,progress,reject)=>{loader.load(`${import.meta.env.BASE_URL}models/lanlao-rig-motion-refined.glb`,resolve,progress,reject);return ()=>manager.abort();},onProgress:e=>{if(!contextLost&&e.total)$('#progress').textContent=`Loading · ${Math.round(e.loaded/e.total*100)}%`;}}).then(gltf=>{
 if(contextLost)return;
 model=gltf.scene;dog.add(model);
 model.traverse(o=>{if(o.isSkinnedMesh && !petMesh)petMesh=o;});
 speechHead=model.getObjectByName('Head');
 idle=createLanlaoIdle(model);
 expression=createLanlaoExpression(model);
 petBody=createLanlaoPetting(model);
 posture=createLanlaoPosture(model);
 stride=createLanlaoStride(model,dog,posture);
 eyelids=createLanlaoBlink(model,`${import.meta.env.BASE_URL}models/lanlao-eye-coat.png`);
 model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=false;o.frustumCulled=false;for(const material of [o.material].flat()){if(material.normalScale)material.normalScale.set(.4,.4);material.metalness=0;material.roughness=1;}}if(o.morphTargetInfluences)morphWeights.push(o.morphTargetInfluences);if(o.isBone)rest.push({o,p:o.position.clone(),q:o.quaternion.clone(),s:o.scale.clone()});});
 mixer=new THREE.AnimationMixer(model);
 webFur=createWebFur(model,{layers:matchMedia('(max-width:760px)').matches?6:8,length:.009,lanlaoCoat:true});
 softenLanlaoEarColor(model);
 if(webFurMode){$('#fur-toggle').disabled=webFur.count===0;document.querySelector('footer>span:last-child').textContent='Web fur preview · Original colors and four animations';}
 for(const clip of gltf.animations)actions[clip.name]=mixer.clipAction(clip);
 const required=['Walk_Refined','Run_Trot_Natural','Tail_Wag_Natural'];
 if(required.some(n=>!actions[n])){fail('animation');return;}
 mixer.addEventListener('finished',e=>{if(e.action===activeAction)finishedAction=e.action;});
 ready=true;greetButton.disabled=false;petButton.disabled=false;$('#loading').classList.add('hidden');document.querySelectorAll('[data-command],#send').forEach(b=>b.disabled=false);
 mic.disabled=!Recognition;state.textContent=tr('stateReady');reply.textContent=`${tr('brand')}: Hi, Josh.`;bubble.hidden=false;
}).catch(error=>{if(!contextLost)fail(error?.code==='MODEL_LOAD_STALLED'?'timeout':'model');});
function play(name,once=false){
 const next=actions[name];if(activeAction===next&&next.isRunning())return;
 const previous=activeAction;next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1);next.setLoop(once?THREE.LoopOnce:THREE.LoopRepeat,once?1:Infinity);next.clampWhenFinished=once;next.play();
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
 onwardTravel=null;
 if(stride.active){
  posture.beginGaitSettle();posture.restore();stride.stop();
  mixer.stopAllAction();activeAction=null;return;
 }
 if(!activeAction)return;
 if(isGaitAction(activeAction)){
  posture.beginGaitSettle();
  posture.restore();
  mixer.stopAllAction();activeAction=null;return;
 }
 // Capture the widened, planted wag pose before blending back to rest.
 // Render overlays are normally restored after drawing; omitting this would
 // drop the tail back to the smaller authored angle on an interrupted wag.
 if(activeAction===actions.Tail_Wag_Natural&&!reducedMotion.matches)posture.applyTailWag();
 const pose=rest.map(({o})=>[o.position.clone(),o.quaternion.clone(),o.scale.clone()]);
 posture.restore();
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
 }else if(command==='come'){
  const plan=planLanlaoApproach({camera,position:dog.position});
  travelViewTarget=null;travelFocusTarget=null;approachView=true;
  approachCameraMove=plan.cameraPosition?{from:camera.position.clone(),to:plan.cameraPosition,start:dog.position.clone(),distance:plan.advance}:null;
  prepareTravel({...plan,mode:command,route:null,run:false});
 }else if(command==='home'){
  approachView=false;travelFocusTarget=normalViewTarget.clone();
  prepareTravel({mode:command,destination:home.clone(),route:null,run:false,pace:1});
 }else if(command==='walk'||command==='run'){
  const plan=planLanlaoRequestedTravel({camera,target:normalViewTarget,position:dog.position,heading:facingYaw(),run:command==='run'});
  if(!plan){mode='stop';return false;}
  const request={...plan.activity,mode:command,run:command==='run'};
  prepareFramedTravel(plan,request);
 }else play('Tail_Wag_Natural',true);
 return true;
}
function prepareFramedTravel(plan,request){
 approachView=false;approachCameraMove=null;
 if(camera.position.distanceTo(plan.cameraPosition)>.02||controls.target.distanceTo(normalViewTarget)>.02){
  controls.maxDistance=Math.max(controls.maxDistance,plan.cameraPosition.distanceTo(normalViewTarget));
  travelViewTarget=plan.cameraPosition;travelFocusTarget=normalViewTarget.clone();pendingTravelStart=request;mode='framing';
 }else prepareTravel(request);
}
function prepareTravel(request){
 activateTravel(request);
}
function activateTravel(request,continuous=false){
 if(request.mode!=='come')approachView=false;
 mode=request.mode;destination=request.destination;activeRoute=request.route;
 autonomousPace=request.pace;
 const label=request.mode==='dash'?'run':request.mode==='explore'?'walk':request.mode==='approach'?'come':request.mode;
 state.textContent=tr(`action_${label}`);
 if(!continuous)locomotion.reset();
 mixer.stopAllAction();activeAction=null;stride.start();
 onwardTravel=null;
 if(activeRoute&&(mode==='walk'||mode==='run')){
  const next=autonomy.roam(activeRoute.end,request.run,{playful:true,heading:activeRoute.sample(activeRoute.length).yaw,startCurvature:activeRoute.curvature(activeRoute.length)});
  if(next.route)onwardTravel=next;
 }
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
 pendingTravelStart=null;
 approachCameraMove=null;
 closeGreetingTime=0;
 if(command==='come'){travelViewTarget=null;travelFocusTarget=null;}
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
 automaticRest=false;quietRestDuration=null;pendingQuietActivity=null;greetingQueued=false;queuedMove=null;queuedMoveDelay=0;quietTime=0;playCount=0;nextActivity=10;
 if(isLocomoting()&&!reducedMotion.matches){
  if(activeRoute&&(command==='walk'||command==='run')){
   mode=command;autonomousPace=command==='run'?2.4+Math.random()*.3:.95;
   const plan=planLanlaoRequestedTravel({camera,target:normalViewTarget,position:activeRoute.end,
    heading:activeRoute.sample(activeRoute.length).yaw,run:command==='run',startCurvature:activeRoute.curvature(activeRoute.length)});
   if(plan){onwardTravel=plan.activity;if(camera.position.distanceTo(plan.cameraPosition)>.02){controls.maxDistance=Math.max(controls.maxDistance,plan.cameraPosition.distanceTo(normalViewTarget));travelViewTarget=plan.cameraPosition;travelFocusTarget=normalViewTarget.clone();}}
   brakingCommand=null;announceCommand(command,quiet);return;
  }
  brakingCommand=command;
  announceCommand(command,quiet);
  return;
 }
 applyCommand(command,quiet);
}
function applyCommand(command,quiet){
 brakingCommand=null;
 destination=null;
 activeRoute=null;
 if(command==='jump'||stride.active||isGaitAction(activeAction)||(movingCommands.has(command)&&activeAction))stopGait();
 const resting=command==='sit'||command==='lie'||command==='stand'||command==='stop';
 if(resting){
  stopGait();mode='stop';
  posture.set(command==='sit'||command==='lie'?command:'stand');
 }else if(!posture.ready||posture.current!=='stand'||gaitSettle>0){
  posture.set('stand');mode='stop';queuedMove=command;
 }else if(startMove(command)===false){
  announceCommand('stop',quiet);state.textContent=tr('travelNeedsView');return;
 }
 announceCommand(command,quiet);
}
function startAutonomousGait(dash){
 beginQuietActivity(autonomy.roam(dog.position,dash,{heading:facingYaw()}));
}
function startGreetingApproach(){
 const toward=camera.position.clone().sub(dog.position).setY(0).normalize();
 const target=dog.position.clone().addScaledVector(toward,.38).clampLength(0,.61);
 state.textContent=tr('action_come');
 // Keep the fixed caption visible during idle movements.
 prepareTravel({mode:'approach',destination:target,route:null,run:false,pace:1.25});

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
 activeRoute=null;onwardTravel=null;locomotion.reset();
 mixer.stopAllAction();activeAction=null;stride.start();

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
 activeRoute=null;
 greetingQueued=false;
 mode='stop';
 stopGait();
 if(restHere){
  beginQuietActivity(autonomy.afterTravel());
 }else{
  nextActivity=Math.max(nextActivity,quietTime+4+Math.random()*3);
  state.textContent=tr('stateReady');
 }
}
function beginQuietActivity(activity){
 document.querySelectorAll('[data-command]').forEach(button=>{
  button.classList.remove('active');button.setAttribute('aria-pressed','false');
 });
 if(activity.type==='walk'||activity.type==='run'){
  const running=activity.type==='run';
  state.textContent=tr(running?'action_run':'action_walk');
  const request={...activity,mode:running?'dash':'explore',run:running};
  if(activity.viewPlan)prepareFramedTravel(activity.viewPlan,request);
  else prepareTravel(request);
  return;
 }
 mode='stop';
 destination=null;
 automaticRest=activity.type!=='stand';
 posture.set(activity.type);
 // Start the rest clock only once the sit/lie transition has settled.
 quietRestDuration=activity.duration;
 nextActivity=Infinity;
 updateRestControl();
 state.textContent=tr(activity.type==='stand'?'stateReady':`action_${activity.type}`);
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
 // Keep the fixed caption visible during idle movements.
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
function nextQuietActivity(){
 const activity=autonomy.next(dog.position,{heading:facingYaw()});
 // A close portrait is deliberately outside the full-body roaming footprint.
 // A failed departure must not strand the dog in endless standing rests.
 if(activity.type==='stand'&&approachView&&!createLanlaoRoamingArea(camera).contains(dog.position,.22)){
  const plan=planLanlaoRequestedTravel({camera,target:normalViewTarget,position:dog.position,heading:facingYaw(),run:false});
  if(plan)return {...plan.activity,viewPlan:plan};
 }
 return activity;
}
function updateAutonomy(){
 if(mode!=='stop'||!posture.ready||gaitSettle>0||queuedMove)return;
 if(quietRestDuration!==null){nextActivity=quietTime+quietRestDuration;quietRestDuration=null;}
 if(greetingQueued){
  greetingQueued=false;
  startGesture('greeting');
  return;
 }
 const engaged=attention.fresh;
 if(!engaged&&quietTime<nextActivity)return;
 if(pendingQuietActivity){
  const activity=pendingQuietActivity;pendingQuietActivity=null;
  if(engaged)startGreetingApproach();
  else beginQuietActivity(activity);
  return;
 }
 if(automaticRest){
  automaticRest=false;
  playCount=0;
  const activity=engaged?null:nextQuietActivity();
  if(activity&&activity.type!=='walk'&&activity.type!=='run'){
   beginQuietActivity(activity);return;
  }
  pendingQuietActivity=activity;
  posture.set('stand');
  updateRestControl();
  state.textContent=tr('action_stand');
  quietRestDuration=engaged?.25:.6+Math.random()*.5;
  nextActivity=Infinity;
 }else if(posture.current==='stand'){
  if(engaged)startGreetingApproach();
  else beginQuietActivity(nextQuietActivity());
 }
}
const askAI=createAIChat();let answering=false, commandVersion=0, requestSerial=0;
const commandInput=$('#command-text'),sendCommand=$('#send');
function updateSend(){sendCommand.disabled=!ready||(answering&&!isImmediateStop(commandInput.value)&&!detectDistress(commandInput.value));}
function cancelPending(){if(!answering)return;requestSerial++;answering=false;askAI.cancel();updateSend();}
commandInput.addEventListener('input',updateSend);
stopRenderActivity=()=>{commandVersion++;cancelPending();voicePlayback.stop();recognition?.abort();};
const accept=guardLanlaoInput({isAvailable:()=>ready&&!contextLost,handle:async text=>{const careReply=care.check(text);if(careReply){cancelPending();voicePlayback.stop();execute('stop');reply.textContent=`${tr('brand')}: ${careReply}`;conversationStatus.local();renderConversationStatus();commandInput.value='';updateSend();return;}
 if(/^(?:hi|hello|hey)(?:[, ]+(?:lanlao))?[.!?]*$/i.test(text.trim())){commandVersion++;cancelPending();bubble.hidden=false;reply.textContent='Hi, Josh.';conversationStatus.local();renderConversationStatus();clearSubmittedInput(commandInput,text);return;}
 const action=parseCommand(text,{postures:true});
 // A direct stop is a control, not a request that should wait for a network
 // response. It also invalidates any older pending reply and its history.
 if(isImmediateStop(text)){cancelPending();voicePlayback.stop();execute('stop');conversationStatus.local();renderConversationStatus();commandInput.value='';updateSend();care.noteActivity();return;}
 const direct=directPetCommand(text);
 if(direct||['sit','lie','stand'].includes(action)){commandVersion++;cancelPending();voicePlayback.stop();quietTime=0;nextActivity=10;greetingQueued=false;execute(direct||action);conversationStatus.local();renderConversationStatus();$('#command-text').value='';care.noteActivity();return;}
 if(answering)return;quietTime=0;nextActivity=10;greetingQueued=false;bubble.hidden=false;voicePlayback.stop();
 // A new message also supersedes any delayed farewell motion.
 const requestVersion=++commandVersion;
 const currentRequest=++requestSerial;answering=true;updateSend();reply.textContent=`${tr('brand')}: ${tr('thinking')}`;
 try{const answer=await askAI(text,()=>requestVersion===commandVersion);if(requestVersion!==commandVersion)return;if(answer.action)execute(answer.action);reply.textContent=`${tr(answer.source==='system-privacy'?'systemPrivacy':answer.source==='system-action'?'systemAction':'brand')}: ${answer.caption}`;void voicePlayback.speak(answer.caption);conversationNeedsLogin=false;conversationStatus.succeeded(answer.source);renderConversationStatus();clearSubmittedInput(commandInput,text);}
 catch(error){if(requestVersion!==commandVersion)return;const answer=respond(text,locale());if(answer.action)execute(answer.action);reply.textContent=`${tr('brand')}: ${answer.caption}`;void voicePlayback.speak(answer.caption);conversationNeedsLogin=error.status===401;conversationStatus.failed();renderConversationStatus();clearSubmittedInput(commandInput,text);}
 finally{if(currentRequest===requestSerial){answering=false;updateSend();care.noteActivity();}}}});
document.querySelectorAll('[data-command]').forEach(b=>b.onclick=()=>{cancelPending();voicePlayback.stop();execute(b.dataset.command);conversationStatus.local();renderConversationStatus();if(b.dataset.command!=='stop')void voicePlayback.speak(tr(`action_${b.dataset.command}`)+'.');});
$('#command-form').onsubmit=e=>{e.preventDefault();const v=$('#command-text').value.trim();if(v)accept(v);};

// Explicit, one-utterance microphone sessions. No background listening or audio storage.
let listening=false,voiceError=false;
if(!Recognition)$('#voice-status').textContent=recognitionStatus('unsupported',locale());
mic.setAttribute('aria-pressed','false');
mic.onclick=()=>{
 if(!Recognition||!ready)return;
 if(recognition){recognition.stop();return;}
 voicePlayback.stop();
 recognition=new Recognition();recognition.lang=languageSelect.value;recognition.continuous=false;recognition.interimResults=true;recognition.maxAlternatives=1;voiceError=false;voiceErrorCode=null;
 const session=recognition,previousSpeech=bubbleText.textContent;let heardText='';const watchdog=createRecognitionWatchdog(session,{onTimeout:()=>{if(recognition!==session)return;recognition=null;listening=false;voiceError=true;voiceErrorCode=voiceErrorCode||'timeout';mic.setAttribute('aria-pressed','false');mic.classList.remove('listening');mic.innerHTML=tr('micStart');renderIcons();$('#voice-status').textContent=recognitionStatus(voiceErrorCode,locale());showSpeech(recognitionStatus(voiceErrorCode,locale()));}});
 session.onstart=()=>{if(watchdog.expired||recognition!==session)return;listening=true;mic.setAttribute('aria-pressed','true');mic.classList.add('listening');mic.textContent=tr('listening');$('#voice-status').textContent=tr('listening');showSpeech(tr('listening'));};
 session.onresult=e=>{if(watchdog.expired||recognition!==session||!ready||contextLost)return;for(let i=e.resultIndex;i<e.results.length;i++){const t=e.results[i][0].transcript;heardText=t;$('#voice-status').textContent=`${tr('heard')}${t}`;if(e.results[i].isFinal)accept(t);}};
 bindRecognitionErrors(session,{locale,onError:(code,message)=>{if(watchdog.expired||recognition!==session)return;voiceError=true;voiceErrorCode=code;$('#voice-status').textContent=message;showSpeech(message);}});
 session.onend=()=>{watchdog.cancel();if(watchdog.expired||recognition!==session)return;recognition=null;listening=false;mic.setAttribute('aria-pressed','false');mic.classList.remove('listening');mic.innerHTML=tr('micStart');renderIcons();if(!voiceError){$('#voice-status').textContent=heardText?`${tr('heard')}${heardText}`:tr('micStatus');if(bubbleText.textContent===tr('listening'))showSpeech(previousSpeech);}};
 watchdog.start();try{session.start();}catch{watchdog.cancel();recognition=null;listening=false;voiceErrorCode='start';$('#voice-status').textContent=recognitionStatus(voiceErrorCode,locale());}
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
 if(travelViewTarget||travelFocusTarget){
  if(travelViewTarget)camera.position.lerp(travelViewTarget,1-Math.exp(-dt*9));
  if(travelFocusTarget)controls.target.lerp(travelFocusTarget,1-Math.exp(-dt*9));
  controls.update();
  if((!travelViewTarget||camera.position.distanceTo(travelViewTarget)<.012)
   &&(!travelFocusTarget||controls.target.distanceTo(travelFocusTarget)<.012)){
   if(travelViewTarget)camera.position.copy(travelViewTarget);
   if(travelFocusTarget)controls.target.copy(travelFocusTarget);
   travelViewTarget=null;travelFocusTarget=null;controls.update();
   if(pendingTravelStart){const request=pendingTravelStart;pendingTravelStart=null;activateTravel(request);}
  }
 }
 if(approachView&&ready){
  if(approachCameraMove){
   const motion=approachCameraMove;
   if(mode==='come'&&motion.distance>.03)camera.position.lerpVectors(motion.from,motion.to,ease(dog.position.distanceTo(motion.start)/motion.distance));
   else camera.position.lerp(motion.to,1-Math.exp(-dt*5));
   if(camera.position.distanceTo(motion.to)<.004)approachCameraMove=null;
  }
  approachFocus.copy(dog.position);approachFocus.y+=LANLAO_APPROACH_FOCUS_HEIGHT;
  controls.target.lerp(approachFocus,1-Math.exp(-dt*5));controls.update();
 }
 closeGreetingTime=Math.max(0,closeGreetingTime-dt);
 stage.classList.toggle('is-close',approachView);
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
  if(isAutonomousGait()&&!canPlay&&!brakingCommand)brakingCommand='stop';
  let arrived=false;
  let travel;
  if(isLocomoting()){
   const run=mode==='run'||mode==='dash';
   const pace=activeRoute||mode==='come'?autonomousPace:mode==='approach'?1.25:mode==='peel'?(greetingPlayful?1.25:.9):1;
   travel=locomotion.move(dt,{destination,route:activeRoute,nextRoute:onwardTravel?.route,
    run,pace,brake:!!brakingCommand,faceBeforeMoving:mode==='come',faceOnArrival:mode==='come'?camera.position:null,exitSpeed:onwardTravel?Math.min(run?1.05:.22,
     LANLAO_TURN_RATE_LIMIT/Math.max(.001,Math.abs(activeRoute.curvature(activeRoute.length)),Math.abs(onwardTravel.route.curvature(0)))):0});
   arrived=travel.arrived;
  }
  mixer.update(dt);
  if(finishedAction){
   const completed=finishedAction;
   finishedAction=null;
   if(completed===activeAction)execute('stop',true);
  }
  if(isLocomoting()&&stride.active)stride.update(dt,travel);
  if(arrived){
   if(brakingCommand)applyCommand(brakingCommand,true);
   else if(mode==='come'){applyCommand('stop',true);quietTime=0;nextActivity=12+Math.random()*5;closeGreetingTime=2;state.textContent=tr('comeClose');}
   else if(mode==='approach')landApproach();
   else if(isAutonomousGait())finishActivity(mode==='explore'||mode==='dash');
   else if(mode==='walk'||mode==='run'){
    if(onwardTravel)activateTravel({...onwardTravel,mode,run:mode==='run',pace:autonomousPace},true);
    else{const command=mode;finishActivity();queuedMove=command;queuedMoveDelay=.4+Math.random()*.8;}
   }
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
  if(canPlay&&!petHover&&pettingTime===0){quietTime+=dt;updateAutonomy();}
  if(mode==='turn'||mode==='jump')animateGroundedAction(dt,canPlay);
  else if(isGesture())animateGesture(dt,!canPlay);
  else if(mode==='wag'&&!reducedMotion.matches)posture.applyTailWag();
  if(mode==='stop'&&gaitSettle===0){
   const activeStage=stageVisible||!automaticRest;
   posture.apply(activeStage?dt:0,{snap:reducedMotion.matches&&!automaticRest});
   if(posture.ready&&queuedMove){
    queuedMoveDelay=Math.max(0,queuedMoveDelay-dt);
    if(queuedMoveDelay===0){const command=queuedMove;queuedMove=null;if(startMove(command)===false){announceCommand('stop',true);state.textContent=tr('travelNeedsView');}}
   }
   if(posture.ready&&mode==='stop')idle.apply(dt,{visible:stageVisible,reduced:reducedMotion.matches,
    listening:listening||answering,camera:camera.position,body:dog,posture:posture.current});
   else idle.fade(dt);
  }else idle.fade(dt);
  petBody.apply(dt,{active:pettingTime>0,available:mode==='stop'&&posture.ready&&gaitSettle===0&&stageVisible&&!reducedMotion.matches,side:petSide});
  expression.apply(dt,{mode,visible:stageVisible,reduced:reducedMotion.matches,engaged:attention.recent||closeGreetingTime>0,
   listening:listening||answering,body:dog,camera:camera.position,gestureDepth,gestureTime,gestureLook,
   jumpTime:groundedActionTime,greetingLandingAge,petting:pettingTime>0||closeGreetingTime>0,
   gaitPhase:stride.active?stride.phase:undefined});
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
