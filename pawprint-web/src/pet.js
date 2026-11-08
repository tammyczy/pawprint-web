import './studio.css';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {createWebFur} from './web-fur.js';
import {createStrandFur} from './strand-fur.js';
import {repairXiaoqWalk} from './xiaoq-walk.js';
import {respond} from './companion.js';
import {createAIChat} from './ai-chat.js';
import {createConversationStatus} from './conversation-status.js';
import {createVoicePanel} from './voice-ui.js';
import './speech.css';
import './pet.css';
import './i18n.css';
import {initI18n,tr,locale} from './i18n.js';
import {createCare} from './care.js';
const $=s=>document.querySelector(s),id=new URLSearchParams(location.search).get('id');
let renderPet=()=>{};
const petI18n=initI18n('pet',()=>renderPet());
const sampleURL='/models/lanlao-rig-hip-refined.glb',wrap=$('#viewer'),status=$('#viewer-status');wrap.style.position='relative';
const overlay=document.createElement('div');overlay.className='viewer-overlay';const bar=document.createElement('progress');const percent=document.createElement('small');const actions=document.createElement('div');actions.className='row';status.before(overlay);overlay.append(status,bar,percent,actions);
function showState(key,{loading=false,detail='',buttons=[]}={}){overlay.hidden=false;status.hidden=false;status.dataset.i18n=key;status.textContent=tr(key);status.setAttribute('role',loading?'status':'alert');bar.hidden=!loading;bar.removeAttribute('value');percent.textContent='';actions.replaceChildren(...buttons);if(detail)$('#message').textContent=detail;if(!loading)$('.model-details').open=true;}
const fail=key=>Object.assign(new Error(tr(key)),{key});
// Load a GLB with visible progress; only same-origin/blob/data resources are allowed.
function loadGLB(url){const manager=new THREE.LoadingManager();manager.setURLModifier(value=>{if(value===url||value.startsWith('blob:')||value.startsWith('data:'))return value;throw new Error('模型引用了外部资源，已阻止加载。');});
 return new Promise((resolve,reject)=>new GLTFLoader(manager).setMeshoptDecoder(MeshoptDecoder).load(url,resolve,event=>{if(event.lengthComputable&&event.total){bar.max=event.total;bar.value=event.loaded;percent.textContent=`${Math.round(event.loaded/event.total*100)}% · ${(event.total/1048576).toFixed(1)} MB`;}else if(event.loaded)percent.textContent=`${(event.loaded/1048576).toFixed(1)} MB`;},error=>{const code=error?.response?.status;reject(Object.assign(fail(code===404||code===410?'petModelMissing':code||error instanceof TypeError?'petModelNet':'petModelBroken'),{cause:error}));}));}
const link=(key,href)=>{const a=document.createElement('a');a.href=href;a.className='button-link';a.textContent=tr(key);return a;},action=(key,run,primary)=>{const b=document.createElement('button');b.type='button';b.textContent=tr(key);if(primary)b.className='primary';b.onclick=run;return b;};
let started=false;
async function showSample(){showState('petLoading',{loading:true});try{const model=await loadGLB(sampleURL);start({name:tr('brand'),species:'dog',message:tr('sampleNote'),references:[]},sampleURL,model,null);const flag=document.createElement('span');flag.className='sample-flag';flag.textContent=tr('sampleFlag');wrap.append(flag);$('#name').textContent=tr('sampleName');$('#message').textContent=tr('sampleNote');$('#download').hidden=true;}catch(error){console.error(error);showState('petLoadError',{buttons:[action('petRetry',()=>location.reload(),true),link('petBackStudio','/studio.html')]});}}
async function boot(){showState('petLoading',{loading:true});let job=null;
 try{
  if(!/^[a-f0-9-]{36}$/.test(id||''))throw fail('petJobMissing');
  let response;try{response=await fetch(`/api/jobs/${id}`,{signal:AbortSignal.timeout(15000)});}catch{throw fail('petModelNet');}
  try{job=await response.json();}catch{job=null;}
  if(response.status===404||response.status===401)throw fail('petJobMissing');if(!response.ok||!job||typeof job!=='object')throw Object.assign(fail(response.status>=500||!job?'netServer':'requestFailed'),{detail:job?.error});
  $('#name').textContent=job.name;if(job.mock){const demo=document.createElement('span');demo.className='badge demo-badge';demo.textContent=tr('demoMode');demo.title=tr('demoModeHint');$('.workspace-head .badge').after(demo);}
  if(!job.hasModel)throw fail('petNoModel');
  const url=`/api/jobs/${id}/model`,model=await loadGLB(url);start(job,url,model,id);
 }catch(error){console.error(error);if(started)return showState('petLoadError',{detail:error.message,buttons:[action('petRetry',()=>location.reload(),true),link('petBackStudio','/studio.html')]});showState(error.key||'petLoadError',{detail:error.detail||job?.message||error.message,buttons:[action('petViewSample',showSample,true),action('petRetry',()=>location.reload()),link('petBackStudio','/studio.html')]});}
}
function start(job,url,model,petId){started=true;
 const isCat=job.species==='cat';
 let referenceAudio=null;
 function stopReferenceAudio(){if(referenceAudio){referenceAudio.pause();referenceAudio.currentTime=0;}}
 $('#name').textContent=job.name;$('#message').textContent=job.message;
 const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
 wrap.append(renderer.domElement);const scene=new THREE.Scene();scene.background=new THREE.Color('#eae9df');scene.add(new THREE.HemisphereLight(0xfffcf5,0xb6af9e,2.1));const light=new THREE.DirectionalLight(0xfff8ed,2.4);light.position.set(-3,5,-4);scene.add(light);const fill=new THREE.DirectionalLight(0xf0f5ff,1.1);fill.position.set(3,2,3);scene.add(fill);
 const camera=new THREE.PerspectiveCamera(40,1,.01,1000),controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;
 overlay.hidden=true;const pet=new THREE.Group();pet.add(model.scene);scene.add(pet);
 const initialBounds=new THREE.Box3().setFromObject(model.scene);model.scene.position.y-=initialBounds.min.y;
 const bounds=new THREE.Box3().setFromObject(model.scene),center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3()),radius=Math.max(size.x,size.y,size.z,.1);
 model.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;for(const m of [o.material].flat()){if(m.normalScale)m.normalScale.set(.35,.35);m.roughness=.92;m.metalness=0;}}});
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(radius*200,radius*200),new THREE.MeshStandardMaterial({color:0xeae9df,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-radius*.008;floor.receiveShadow=true;scene.add(floor);
 light.castShadow=true;light.shadow.mapSize.set(2048,2048);Object.assign(light.shadow.camera,{left:-radius*2,right:radius*2,top:radius*2,bottom:-radius*2,near:.1,far:20});light.shadow.normalBias=.012;light.shadow.bias=-.0002;light.shadow.radius=4;
 controls.maxPolarAngle=Math.PI*.48;controls.minDistance=radius*1.2;controls.maxDistance=radius*4;controls.enablePan=false;
 function resetView(){controls.target.copy(center).add(new THREE.Vector3(0,radius*.08,0));camera.position.copy(center).add(new THREE.Vector3(radius*.95,radius*.48,-radius*1.8));controls.update();}
 resetView();$('#reset-view').onclick=resetView;camera.far=Math.max(100,radius*220);camera.updateProjectionMatrix();
 const mixer=new THREE.AnimationMixer(model.scene);for(const [index,clip]of model.animations.entries()){const option=document.createElement('option');option.value=index;option.textContent=clip.name||`动作 ${index+1}`;$('#animations').append(option);}$('#animations').onchange=e=>{mixer.stopAllAction();destination=null;mode=e.target.value===''?'stop':'preview';if(e.target.value!=='')mixer.clipAction(model.animations[Number(e.target.value)]).reset().setLoop(THREE.LoopRepeat,Infinity).play();};
 const bubble=document.createElement('div');bubble.id='dog-speech';const speaker=document.createElement('span');speaker.className='dog-speech-name';speaker.textContent=job.name;const speech=document.createElement('div');speech.className='dog-speech-text';speech.textContent='我来啦，和我说句话吧！';bubble.append(speaker,speech);wrap.append(bubble);
 speech.setAttribute('role','status');speech.setAttribute('aria-live','polite');
 const panel=$('#interaction');const caption=document.createElement('p');caption.className='interaction-note';caption.textContent='试试“你好”“小Q过来”或“你真乖”。灰色动作还在适配中。';const buttons=document.createElement('div');buttons.className='action-grid';const preferences=document.createElement('div');preferences.className='preferences';
 const conversationStatus=createConversationStatus();
 const renderConversationStatus=()=>{caption.textContent=tr(conversationStatus.key);};
 fetch('/api/health',{signal:AbortSignal.timeout(8000)}).then(r=>{if(!r.ok)throw new Error('Health check failed');return r.json();}).then(data=>{conversationStatus.health(data.conversation==='openai');renderConversationStatus();voicePlayback.setAvailable(data.speech==='openai');}).catch(()=>{conversationStatus.healthFailed();renderConversationStatus();voicePlayback.setAvailable(false);});
 let mode='stop',destination=null;
 const correctedWalk=petId==='43788e99-7894-4b2f-ae42-33757b37227a'?repairXiaoqWalk(model.scene):null;
 if(correctedWalk){
  model.scene.updateMatrixWorld(true);model.scene.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});
  const grounded=new THREE.Box3().setFromObject(model.scene);model.scene.position.y-=grounded.min.y;
  model.scene.updateMatrixWorld(true);model.scene.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});
  bounds.setFromObject(model.scene);bounds.getCenter(center);resetView();
  $('#animations').disabled=true;$('#message').textContent='小Q网页动作：行走、原地跑步、摇尾巴、跳跃与走近。采用专用骨骼与程序动画，仍在打磨；下载的原始 GLB 不包含这些网页动作。';
 }
 const rest=[];model.scene.traverse(o=>{if(o.isBone)rest.push({o,p:o.position.clone(),q:o.quaternion.clone(),s:o.scale.clone()});});
 const walk=model.animations.find(c=>/walk/i.test(c.name))||(model.animations.length===1?model.animations[0]:null);
 const run=model.animations.find(c=>/run|trot/i.test(c.name));const jump=model.animations.find(c=>/jump/i.test(c.name));const wag=model.animations.find(c=>/wag|tail.?flick/i.test(c.name));
 const clips={walk,come:walk,home:walk,run,jump,wag};
 if(correctedWalk)for(const action of ['walk','come','home','run','jump','wag'])clips[action]=true;
 if(correctedWalk)caption.textContent='试试“跑步”“摇尾巴”或“跳一下”。跑步为原地展示，跳跃完成后自动停下。';
 function execute(command){if(command!=='stop'&&!clips[command]){speech.textContent='这个动作还在适配中，先陪我走一走吧。';return false;}mixer.stopAllAction();destination=null;mode=command;
  for(const button of buttons.children)button.setAttribute('aria-pressed',String(button.dataset.command===command));
  correctedWalk?.start(command);
  if(command!=='stop'&&!correctedWalk){const once=['jump','wag'].includes(command);mixer.clipAction(clips[command]).reset().fadeIn(.25).setLoop(once?THREE.LoopOnce:THREE.LoopRepeat,once?1:Infinity).play();}
  if(command==='come')destination=new THREE.Vector3(camera.position.x-center.x,0,camera.position.z-center.z).normalize().multiplyScalar(radius*.45);
  if(command==='home')destination=new THREE.Vector3();return true;
 }
 let hasSpoken=false;
  function showAnswer(answer,text){hasSpoken=true;if((answer.action&&clips[answer.action])||answer.action==='stop')execute(answer.action);speech.textContent=answer.caption;void voicePlayback.speak(answer.caption);input.value='';}
 const askAI=createAIChat(petId);let answering=false;
  async function accept(text){if(answering)return;const careReply=care.check(text);if(careReply){voicePlayback.stop();execute('stop');speech.textContent=careReply;hasSpoken=true;input.value='';return;}stopReferenceAudio();voicePlayback.stop();answering=true;send.disabled=true;speech.textContent=tr('thinking');
  try{const answer=await askAI(text);showAnswer(answer,text);conversationStatus.succeeded();renderConversationStatus();}
   catch(error){showAnswer(respond(text,locale(),job.name,job.species),text);conversationStatus.failed();renderConversationStatus();}
   finally{answering=false;send.disabled=false;care.noteActivity();}}
 for(const command of ['come','walk','run','wag','jump','stop']){const button=document.createElement('button');button.textContent=tr(`pet${command[0].toUpperCase()}${command.slice(1)}`);button.dataset.command=command;button.setAttribute('aria-pressed',String(command==='stop'));button.disabled=command!=='stop'&&!clips[command];button.title=button.disabled?'此模型尚未包含该动作':'';button.onclick=()=>showAnswer(respond(command,locale(),job.name,job.species),command);buttons.append(button);}
 const mic=document.createElement('button');mic.className='voice-button';mic.textContent='和小狗说话';const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;mic.disabled=!Recognition;if(!Recognition)mic.textContent='请用文字和我说话';let recognition;
 const languageLabel=document.createElement('label');languageLabel.textContent='语音识别语言 ';const languageSelect=document.createElement('select');for(const [value,label] of [['zh-CN','中文'],['en-US','English'],['es-ES','Español'],['fr-FR','Français'],['de-DE','Deutsch'],['ja-JP','日本語'],['ko-KR','한국어']]){const option=document.createElement('option');option.value=value;option.textContent=label;languageSelect.append(option);}languageLabel.append(languageSelect);preferences.append(languageLabel);
  mic.setAttribute('aria-pressed','false');mic.onclick=()=>{if(recognition){recognition.stop();return;}stopReferenceAudio();voicePlayback.stop();recognition=new Recognition();recognition.lang=languageSelect.value;recognition.interimResults=false;recognition.continuous=false;recognition.onstart=()=>{mic.setAttribute('aria-pressed','true');mic.textContent=tr('listening');speech.textContent=tr('listening');};recognition.onresult=e=>accept(e.results[0][0].transcript);recognition.onerror=e=>{if(e.error!=='aborted')speech.textContent=tr('notHeard');};recognition.onend=()=>{recognition=null;mic.setAttribute('aria-pressed','false');mic.textContent=tr(isCat?'catMic':'dogMic');};try{recognition.start();}catch{recognition=null;mic.setAttribute('aria-pressed','false');speech.textContent=tr('micUnavailable');}};buttons.append(mic);
 const fur=createWebFur(model.scene,{layers:8,length:radius*.022});const strands=createStrandFur(model.scene,{count:matchMedia('(max-width:760px)').matches?12000:22000,length:radius*.038});const updateShells=fur.update;fur.update=(dt,action)=>{updateShells(dt,action);strands.update(dt,action);};let furry=true;const furButton=document.createElement('button');furButton.textContent=tr('petFurOn');furButton.setAttribute('aria-pressed','true');furButton.disabled=!fur.count;furButton.onclick=()=>{furry=!furry;fur.setEnabled(furry);strands.setEnabled(furry);furButton.textContent=tr(furry?'petFurOn':'petFurOff');furButton.setAttribute('aria-pressed',String(furry));};preferences.append(furButton);
 const furLabel=document.createElement('label');furLabel.className='fur-control';furLabel.textContent='蓬松程度';const furRange=document.createElement('input');furRange.type='range';furRange.min='3';furRange.max='25';furRange.value='22';furRange.setAttribute('aria-label','蓬松程度');furRange.oninput=()=>fur.setLength(Number(furRange.value)*radius/1000);furLabel.append(furRange);
  const form=document.createElement('form');form.className='chat-form';const input=document.createElement('input');input.placeholder=`试试：${job.name}，过来`;input.setAttribute('aria-label','对小狗说的话');input.maxLength=200;const send=document.createElement('button');send.textContent='发送';form.append(input,send);form.onsubmit=e=>{e.preventDefault();if(input.value.trim())accept(input.value.trim());};panel.append(buttons,mic,form,preferences,furLabel,caption);
  const voicePlayback=createVoicePanel({container:panel,locale,beforeSpeak:()=>{stopReferenceAudio();recognition?.abort();},title:job.name});
  const care=createCare({locale,petName:()=>job.name,petKey:petId||'sample',controls:panel,stage:$('.stage'),onGoodbye:line=>{voicePlayback.stop();stopReferenceAudio();if(clips.wag)execute('wag');setTimeout(()=>execute(clips.home?'home':'stop'),2600);speech.textContent=line;hasSpoken=true;}});
 if(job.references?.includes('audio')){
  referenceAudio=new Audio(`/api/jobs/${petId}/reference/audio`);referenceAudio.preload='none';
  const original=document.createElement('button');original.type='button';
  const renderReference=()=>{const playing=!referenceAudio.paused;original.dataset.i18n=playing?'stopReferenceAudio':'referenceAudio';original.textContent=tr(original.dataset.i18n);original.setAttribute('aria-pressed',String(playing));};
  referenceAudio.onplay=referenceAudio.onpause=referenceAudio.onended=renderReference;
  original.onclick=()=>{if(!referenceAudio.paused){stopReferenceAudio();return;}voicePlayback.stop();recognition?.abort();referenceAudio.play().catch(()=>{caption.textContent=tr('notHeard');});};renderReference();preferences.append(original);
 }
 mixer.addEventListener('finished',()=>execute('stop'));
 if(isCat){
  furry=false;fur.setEnabled(false);strands.setEnabled(false);furButton.textContent=tr('petFurOff');furButton.setAttribute('aria-pressed','false');
   mic.textContent='和小猫说话';
  $('.intro').textContent='先看看我的毛色和动作。可以输入文字指令，猫叫音效尚未配置。';
   renderConversationStatus();
  const observer=new MutationObserver(()=>{if(speech.textContent.includes('汪'))speech.textContent=speech.textContent.replaceAll('汪','喵');});observer.observe(speech,{childList:true,characterData:true,subtree:true});
 }
  renderPet=()=>{care.render();voicePlayback.render();furButton.textContent=tr(furry?'petFurOn':'petFurOff');languageSelect.value={zh:'zh-CN',en:'en-US',fr:'fr-FR'}[locale()];languageLabel.firstChild.textContent=tr('petLanguage');send.textContent=tr('petSend');if(!recognition)mic.textContent=Recognition?tr(isCat?'catMic':'dogMic'):tr('petNoMic');furLabel.firstChild.textContent=tr('petFluff');furRange.setAttribute('aria-label',tr('petFluff'));input.placeholder=`${tr('petTry')}${job.name}, ${tr('petCome')}`;input.setAttribute('aria-label',tr('petInput'));if(!hasSpoken)speech.textContent={zh:`主人，我是${job.name}！一起玩吧 🐾`,en:`Hi, my dear owner! I'm ${job.name}. Want to play? 🐾`,fr:`Coucou, mon cher maître ! Je suis ${job.name}. On joue ? 🐾`}[locale()];if(isCat){$('#interaction .intro').textContent=tr('catIntro');furButton.textContent=tr(furry?'petFurOn':'petFurOff');}for(const button of buttons.querySelectorAll('[data-command]')){const command=button.dataset.command;button.textContent=tr(`pet${command[0].toUpperCase()}${command.slice(1)}`);}renderConversationStatus();document.title=`${job.name} · ${tr(isCat?'digitalCat':'digitalDog')}`;};petI18n.render();
  document.addEventListener('visibilitychange',()=>{if(document.hidden){stopReferenceAudio();voicePlayback.stop();recognition?.abort();}});
  window.addEventListener('pagehide',()=>{stopReferenceAudio();voicePlayback.stop();recognition?.abort();});
 const anchor=new THREE.Vector3();let elapsed=0;
 const clock=new THREE.Clock();
 new ResizeObserver(()=>{const {width,height}=wrap.getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();}).observe(wrap);
 renderer.setAnimationLoop(()=>{
  const dt=Math.min(clock.getDelta(),.05);if(document.hidden)return;
  elapsed+=dt;mixer.update(dt);fur.update(dt,mode);
  if(mode==='stop'&&!correctedWalk)for(const r of rest){r.o.position.lerp(r.p,1-Math.exp(-dt*12));r.o.quaternion.slerp(r.q,1-Math.exp(-dt*12));r.o.scale.lerp(r.s,1-Math.exp(-dt*12));}
  if(correctedWalk?.update(dt,mode)?.finished)execute('stop');
  if(destination){
   const delta=destination.clone().sub(pet.position);
   if(delta.length()<radius*.01)execute('stop');
   else{
    const heading=isCat?Math.atan2(-delta.z,delta.x):Math.atan2(-delta.x,-delta.z),target=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),heading);
    pet.quaternion.rotateTowards(target,dt*3);
    if(pet.quaternion.angleTo(target)<.18)pet.position.addScaledVector(delta.normalize(),Math.min(radius*.065/(.95*.68)*dt,pet.position.distanceTo(destination)));
   }
  }
  controls.update();renderer.render(scene,camera);
  anchor.copy(center).add(pet.position);anchor.y=bounds.max.y+radius*.13;anchor.project(camera);
  bubble.style.left=`${THREE.MathUtils.clamp((anchor.x*.5+.5)*wrap.clientWidth,Math.min(150,wrap.clientWidth/2),Math.max(wrap.clientWidth-150,wrap.clientWidth/2))}px`;
  bubble.style.top=`${THREE.MathUtils.clamp((-.5*anchor.y+.5)*wrap.clientHeight,bubble.offsetHeight+18,wrap.clientHeight-25)}px`;
 });
 $('#download').href=url;$('#download').download=`${job.name}-animated.glb`;$('#download').hidden=false;document.title=`${job.name} · ${tr(isCat?'digitalCat':'digitalDog')}`;
}
await boot();

import './design-system.css';

import './experience.js';
