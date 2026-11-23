import './studio.css';
import './studio-merge.css';
import './i18n.css';
import {initI18n,tr,locale} from './i18n.js';
import {attachModelingInputs,modelingText,photoReviewDetails,syntheticReview,modelReviewText} from './studio-modeling.js';
const $=s=>document.querySelector(s),notice=message=>$('#notice').textContent=message;
async function api(url,options={}){let response,body=null;try{response=await fetch(`/api${url}`,{signal:AbortSignal.timeout(options.body instanceof FormData?120000:15000),...options});}catch(e){throw new Error(tr(['TimeoutError','AbortError'].includes(e.name)?'netTimeout':navigator.onLine===false?'netOffline':'netDown'));}
 try{body=await response.json();}catch{}if(!response.ok)throw new Error(body?.error||tr(response.status>=500?'netServer':'requestFailed'));if(!body||typeof body!=='object')throw new Error(tr('netBadResponse'));return body;}
const ACTIVE=['WAITING_APPROVAL','QUEUED','SUBMITTING','RUNNING','PROCESSING','PAUSED_NETWORK'],TONE={WAITING_APPROVAL:'wait',VIEW_REVIEW:'wait',SUBMISSION_UNCERTAIN:'wait',QUEUED:'busy',SUBMITTING:'busy',RUNNING:'busy',PROCESSING:'busy',PAUSED_NETWORK:'wait',REVIEW_REQUIRED:'done',FAILED:'bad',CANCELLED:'muted'};
const trOr=(key,fallback)=>{const value=tr(key);return value===key?fallback:value;},statusLabel=status=>trOr(`status_${status}`,`${tr('statusUnknown')} (${status})`);
let pollTimer=0,pollDelay=5000,lastSignature='',lastRender=null;
function schedule(jobs){clearTimeout(pollTimer);if(document.hidden||!user||!jobs?.some(job=>ACTIVE.includes(job.status)))return;pollTimer=setTimeout(()=>{pollDelay=Math.min(pollDelay*1.6,60000);refresh();},pollDelay);}
let user=null,refreshing=false,serviceConfigured=null,cloud=false,automaticGeneration=false;
const speciesLabel=document.createElement('label');speciesLabel.id='species-label';speciesLabel.append(document.createTextNode('Pet type'));const speciesSelect=document.createElement('select');speciesSelect.name='species';for(const value of ['dog','cat']){const option=document.createElement('option');option.value=value;speciesSelect.append(option);}speciesLabel.append(speciesSelect);$('#create-form>.hint').before(speciesLabel);
const modelingInputs=attachModelingInputs({form:$('#create-form'),photoHost:$('#photo-inputs'),notify:notice});
const viewSelections=new Map();
const references=document.createElement('div');references.className='reference-uploads';for(const [kind,accept] of [['video','video/mp4,video/webm,video/quicktime'],['audio','audio/mpeg,audio/wav,audio/ogg,audio/webm,audio/mp4']]){const label=document.createElement('label');label.dataset.kind=kind;label.append(document.createTextNode(kind));const input=document.createElement('input');input.type='file';input.id=`${kind}-reference`;input.name=`${kind}Reference`;input.accept=accept;label.append(input);references.append(label);}const referenceHint=document.createElement('small');referenceHint.className='reference-hint';references.append(referenceHint);$('#photo-inputs').after(references);
initI18n('studio',()=>{modelingInputs.render();speciesLabel.firstChild.textContent=tr('species');for(const option of speciesSelect.options)option.textContent=tr(option.value);for(const label of references.querySelectorAll('label'))label.firstChild.textContent=tr(label.dataset.kind==='video'?'videoReference':'audioReference');referenceHint.textContent=tr('referenceHint');applyServiceCopy();if(user?.local){$('#identity').textContent=tr('localIdentity');document.querySelector('.note small').textContent=tr('localInfo');}if(user)refresh();});
function applyServiceCopy(){
 if(serviceConfigured!==null)$('#service-state').textContent=tr(automaticGeneration?'cloudGeneration':serviceConfigured?'serviceOn':'serviceOff');
 if(cloud){
  $('#account>div>p:not(.eyebrow)').textContent=tr('cloudAccount');
  $('#invite-label span').textContent=tr('inviteCode');
  $('.note b').textContent=tr('cloudStudio');
 }
 if(automaticGeneration){
  $('.consent span').textContent=tr('cloudConsent');
  $('#create-form>small').textContent=tr('cloudCost');
 }
}
function setUser(value){user=value;$('#account').hidden=!!user;$('#workspace').hidden=!user;$('#logout').hidden=!user||!!user.local;$('#identity').textContent=user?.local?tr('localIdentity'):user?.email||'';if(user?.local){document.querySelector('.note small').textContent=tr('localInfo');}if(user)refresh();}
async function authenticate(mode){notice('');const button=mode==='register'?$('#register'):$('#auth-form button');button.disabled=true;try{const result=await api(`/${mode}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:$('#email').value,password:$('#password').value,...(mode==='register'?{inviteCode:$('#invite-code').value}:{})})});$('#password').value='';$('#invite-code').value='';setUser(result.user);}catch(e){notice(e.message);}finally{button.disabled=false;}}
$('#auth-form').onsubmit=e=>{e.preventDefault();authenticate('login');};$('#register').onclick=()=>{if($('#auth-form').reportValidity())authenticate('register');};
$('#logout').onclick=async()=>{try{await api('/logout',{method:'POST'});clearTimeout(pollTimer);lastSignature='';lastRender=null;viewSelections.clear();setUser(null);$('#jobs').replaceChildren();}catch(e){notice(e.message);}};
$('#create-form').onsubmit=async e=>{e.preventDefault();const button=$('#create');button.disabled=true;notice(tr('saving'));try{const form=new FormData(e.target);const media=[['video',$('#video-reference').files[0],25],['audio',$('#audio-reference').files[0],8]].filter(([,file])=>file?.size);for(const [kind,file,limit]of media)if(file.size>limit*1024*1024)throw new Error(`${kind}: ${tr('tooLarge')}`);form.delete('videoReference');form.delete('audioReference');for(const [key,value]of [...form.entries()])if(value instanceof File&&!value.size)form.delete(key);form.set('consent','yes');const job=await api('/jobs',{method:'POST',body:form});const failures=[];for(const [kind,file]of media){const data=new FormData();data.set('file',file);try{await api(`/jobs/${job.id}/reference/${kind}`,{method:'POST',body:data});}catch(error){failures.push(`${kind}: ${error.message}`);}}e.target.reset();notice(failures.length?`${tr('savedReferenceError')} ${failures.join('; ')}`:media.length?tr('savedWithReference'):tr(automaticGeneration?'cloudSaved':'saved'));await refresh();}catch(e){notice(e.message);}finally{button.disabled=false;}};
function button(label,action,className=''){const b=document.createElement('button');b.textContent=label;b.className=className;b.onclick=async()=>{b.disabled=true;try{await action();}catch(e){notice(e.message);}finally{b.disabled=false;}};return b;}
function renderJob(job){
 const card=document.createElement('article'), body=document.createElement('div');
 card.className='job';body.className='job-body';
 const base=`/jobs/${encodeURIComponent(job.id)}`;
 if(job.status!=='VIEW_REVIEW'){
  const photo=document.createElement('img');photo.src=`/api${base}/photo/front`;photo.alt=job.name;photo.loading='lazy';
  photo.onerror=()=>photo.style.visibility='hidden';card.append(photo);
 }
 const title=document.createElement('h3'), badge=document.createElement('span');
 title.textContent=job.name;badge.className='badge';badge.textContent=statusLabel(job.status);
 badge.dataset.tone=job.modelReview?.result==='invalid_base'?'bad':TONE[job.status]||'muted';
 body.append(title,badge);
 if(job.mock){
  const demo=document.createElement('span');demo.className='badge demo-badge';demo.textContent=tr('demoMode');
  demo.title=tr('demoModeHint');body.append(demo);
 }
 const message=document.createElement('p');
 message.textContent=(job.status==='REVIEW_REQUIRED'&&modelReviewText(job))
  || (automaticGeneration&&job.status==='WAITING_APPROVAL'?tr('cloudSaved')
   :automaticGeneration&&job.status==='PAUSED_NETWORK'?tr('cloudPaused')
   :locale()==='zh'&&job.message?job.message:trOr(`statusHint_${job.status}`,job.message||statusLabel(job.status)));
 if(locale()!=='zh'&&job.message)message.title=job.message;
 body.append(message);
 if(job.photoReview)body.append(photoReviewDetails(job.photoReview,job.status==='WAITING_APPROVAL'));
 if(job.status==='VIEW_REVIEW'){
  if(!viewSelections.has(job.id))viewSelections.set(job.id,new Set());
  const selection=viewSelections.get(job.id);
  const approve=button(modelingText(selection.size?'approveSelection':'approveOriginal'),async()=>{
   await api(`${base}/approve-views`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({views:[...selection]})});
   viewSelections.delete(job.id);
   await refresh();
  },'primary');
  body.append(syntheticReview(job,selection,approve));
 }else if(job.generatedViews?.length)body.append(syntheticReview(job));
 const row=document.createElement('div');row.className='row';
 if(job.hasModel){
  const link=document.createElement('a');link.href=`/pet.html?id=${encodeURIComponent(job.id)}`;
  link.textContent=job.modelReview?modelingText(job.modelReview.result==='animated'?'animatedModel':'staticModel'):tr('viewModel');
  row.append(link);
 }
 for(const kind of job.references||[]){
  const link=document.createElement('a');link.href=`/api${base}/reference/${kind}`;link.target='_blank';link.rel='noopener';
  link.textContent=tr(kind==='video'?'referenceVideo':'referenceAudio');row.append(link);
 }
 if(automaticGeneration&&['WAITING_APPROVAL','PAUSED_NETWORK'].includes(job.status))row.append(button(tr(job.status==='WAITING_APPROVAL'?'startGeneration':'resumeGeneration'),async()=>{await api(`${base}/start`,{method:'POST'});await refresh();}));
 if(!['RUNNING','PROCESSING','SUBMITTING','CANCELLED','REVIEW_REQUIRED'].includes(job.status))row.append(button(tr('cancelTask'),async()=>{await api(`${base}/cancel`,{method:'POST'});await refresh();}));
 if(!['RUNNING','PROCESSING','SUBMITTING'].includes(job.status))row.append(button(tr('deleteTask'),async()=>{if(confirm(tr('deleteConfirm'))){await api(base,{method:'DELETE'});viewSelections.delete(job.id);await refresh();}},'danger'));
 const code=document.createElement('code');code.textContent=`${tr('taskLabel')} ${job.id}`;
 body.append(row,code);card.append(body);
 return card;
}
async function refresh(){
 if(!user||refreshing)return;
 refreshing=true;let jobs=null;
 try{
  ({jobs}=await api('/jobs'));
  if(!Array.isArray(jobs))throw new Error(tr('netBadResponse'));
  const signature=jobs.map(job=>`${job.id}:${job.status}:${job.updated}`).join();
  if(signature!==lastSignature)pollDelay=5000;
  lastSignature=signature;
  const renderKey=`${locale()}:${signature}`;
  if(renderKey===lastRender)return;
  const host=$('#jobs');
  if(jobs.length)host.replaceChildren(...jobs.map(renderJob));
  else{
   const empty=document.createElement('div');empty.className='empty';empty.textContent=tr('emptyJobs');host.replaceChildren(empty);
  }
  lastRender=renderKey;
 }catch(e){notice(e.message);pollDelay=Math.min(pollDelay*2,60000);}
 finally{refreshing=false;schedule(jobs||lastSignature.split(',').map(entry=>({status:entry.split(':')[1]})));}
}
$('#refresh').onclick=refresh;
try{const health=await api('/health');serviceConfigured=health.generationConfigured;cloud=health.deployment==='cloud';automaticGeneration=health.automaticGeneration;applyServiceCopy();$('#register').hidden=!health.registration;$('#invite-label').hidden=!health.registration||!health.inviteRequired;setUser((await api('/me')).user);}catch{notice(tr('cloudConnectionError'));$('#service-state').textContent=tr('cloudConnectionError');}
document.addEventListener('visibilitychange',()=>{if(document.hidden)clearTimeout(pollTimer);else{pollDelay=5000;refresh();}});addEventListener('focus',()=>{if(!document.hidden)refresh();});

import './design-system.css';

import './experience.js';
