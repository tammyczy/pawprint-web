import test from 'node:test';
import assert from 'node:assert/strict';
import {get as httpGet} from 'node:http';
import {mkdtemp,rm,readdir,readFile,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {makeApp} from './server/app.mjs';
import {generationRequest,Tripo,inspectGLB} from './server/tripo.mjs';
import {reserveBudget,remainingGenerationBudget,ensureTaskFunding} from './server/budget.mjs';
import {openStore,updateJob} from './server/store.mjs';
import {shouldMarkWorkerFailed} from './server/worker-state.mjs';
import {respond} from './src/companion.js';

test('private upload, authentication, ownership, CSRF, persistence and deletion',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'lanlao-test-')),origin='http://127.0.0.1:8787';
 const {app,db}=await makeApp({dataDir:dir,origin});const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}`;
 const request=(route,method='GET',body,cookie,csrf=origin)=>fetch(base+'/api'+route,{method,headers:{...(method!=='GET'?{Origin:csrf}:{}),...(body&&!(body instanceof FormData)?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:body instanceof FormData?body:body?JSON.stringify(body):undefined});
 try{
  assert.equal((await request('/jobs')).status,401);
  assert.equal((await request('/register','POST',{email:'owner@example.test',password:'test-passphrase-123'},null,'https://evil.example')).status,403);
  const reg=await request('/register','POST',{email:'owner@example.test',password:'test-passphrase-123'});assert.equal(reg.status,201);const cookie=reg.headers.get('set-cookie').split(';')[0];
  assert.match(reg.headers.get('set-cookie'),/HttpOnly/);assert.match(reg.headers.get('set-cookie'),/SameSite=Strict/);
  assert.equal((await request('/login','POST',{email:'owner@example.test',password:'wrong'})).status,401);
  const bytes=await sharp({create:{width:300,height:300,channels:3,background:'#bda888'}}).png().toBuffer();
  const form=()=>{const f=new FormData();f.set('name','测试小狗 <script>');f.set('species','dog');f.set('mode','direct');f.set('consent','yes');f.set('front',new Blob([bytes],{type:'image/png'}),'../../dog.png');return f;};
  const bad=form();bad.set('front',new Blob(['not a picture'],{type:'image/png'}),'fake.png');assert.equal((await request('/jobs','POST',bad,cookie)).status,400);
  const missing=form();missing.delete('consent');assert.equal((await request('/jobs','POST',missing,cookie)).status,400);
  const small=form();small.set('front',new Blob([await sharp({create:{width:20,height:20,channels:3,background:'red'}}).png().toBuffer()],{type:'image/png'}),'small.png');assert.equal((await request('/jobs','POST',small,cookie)).status,400);
  const response=await request('/jobs','POST',form(),cookie);assert.equal(response.status,201);const job=await response.json();assert.equal(job.status,'WAITING_APPROVAL');assert.equal(job.hasModel,false);
  const photo=await request(`/jobs/${job.id}/photo/front`,'GET',null,cookie);assert.equal(photo.status,200);assert.match(photo.headers.get('cache-control'),/no-store/);
  const reg2=await request('/register','POST',{email:'other@example.test',password:'different-password-123'});const cookie2=reg2.headers.get('set-cookie').split(';')[0];
  for(const endpoint of [`/jobs/${job.id}`,`/jobs/${job.id}/photo/front`,`/jobs/${job.id}/model`])assert.equal((await request(endpoint,'GET',null,cookie2)).status,404);
  assert.equal((await request(`/jobs/${job.id}`,'DELETE',null,cookie2)).status,404);
  assert.equal((await request(`/jobs/${job.id}`,'GET',null,cookie)).status,200);
  assert.equal((await request(`/jobs/${job.id}/model`,'GET',null,cookie)).status,404);
  assert.equal(reserveBudget(db,job.id,100,100),100);assert.equal(reserveBudget(db,job.id,100,100),100);assert.throws(()=>reserveBudget(db,'missing-job',100,100),/TEST_BUDGET_EXCEEDED/);assert.throws(()=>reserveBudget(db,job.id,100,1501),/INVALID_BUDGET/);
  assert.equal(db.prepare('SELECT count(*) AS n FROM jobs').get().n,1);
  const reopened=openStore(dir);assert.equal(reopened.prepare('SELECT status FROM jobs WHERE id=?').get(job.id).status,'WAITING_APPROVAL');reopened.close();
  assert.equal((await request(`/jobs/${job.id}/approve-views`,'POST',null,cookie)).status,409);
  const saved=JSON.parse(db.prepare('SELECT data FROM jobs WHERE id=?').get(job.id).data);saved.generatedViews={front:'generated-front.png'};
  await writeFile(path.join(dir,'assets',job.id,'generated-front.png'),bytes);
  db.prepare("UPDATE jobs SET status='VIEW_REVIEW',data=? WHERE id=?").run(JSON.stringify(saved),job.id);
  assert.equal((await request(`/jobs/${job.id}/generated-view/front`,'GET',null,cookie2)).status,404);
  assert.equal((await request(`/jobs/${job.id}/approve-views`,'POST',null,cookie2)).status,404);
  assert.equal((await request(`/jobs/${job.id}/approve-views`,'POST',null,cookie)).status,200);
  assert.ok(JSON.parse(db.prepare('SELECT data FROM jobs WHERE id=?').get(job.id).data).viewsApprovedAt);
  assert.equal((await request(`/jobs/${job.id}/cancel`,'POST',null,cookie)).status,200);
  assert.equal((await request(`/jobs/${job.id}`,'DELETE',null,cookie)).status,200);assert.deepEqual(await readdir(path.join(dir,'assets')),[]);
  assert.equal((await request(`/jobs/${job.id}`,'GET',null,cookie)).status,404);
  assert.equal((await request('/logout','POST',null,cookie)).status,200);assert.equal((await request('/jobs','GET',null,cookie)).status,401);
 }finally{await new Promise(r=>server.close(r));db.close();await rm(dir,{recursive:true,force:true});}
});

test('studio multipart form accepts four fields with all four photos and rejects extra fields',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'pawprint-form-')),origin='http://127.0.0.1:8788';
 const {app,db}=await makeApp({dataDir:dir,origin,localMode:true});const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const base=`http://127.0.0.1:${server.address().port}`,bytes=await sharp({create:{width:300,height:300,channels:3,background:'#a4ad94'}}).png().toBuffer();
 function form(extra=false){const data=new FormData();for(const [key,value]of Object.entries({name:'QA four-view dog',species:'dog',mode:'direct',consent:'yes'}))data.set(key,value);for(const view of ['front','left','back','right'])data.set(view,new Blob([bytes],{type:'image/png'}),`${view}.png`);if(extra)data.set('unexpected','extra');return data;}
 try{
  const response=await fetch(base+'/api/jobs',{method:'POST',headers:{Origin:origin},body:form()});assert.equal(response.status,201);const job=await response.json();assert.deepEqual(job.views,['front','left','back','right']);assert.equal(job.mode,'direct');assert.equal(job.status,'WAITING_APPROVAL');
  assert.equal((await fetch(base+'/api/jobs',{method:'POST',headers:{Origin:origin},body:form(true)})).status,400);
 }finally{await new Promise(r=>server.close(r));db.close();await rm(dir,{recursive:true,force:true});}
});

test('Tripo requests use documented options and never retry uncertain submission',async()=>{
 const one=generationRequest({front:'file_front'},'v3.1-20260211');assert.equal(one.endpoint,'/generation/image-to-model');assert.equal(one.body.texture_alignment,'original_image');
 const multi=generationRequest({front:'f',left:'l'},'v3.1-20260211');assert.deepEqual(multi.body.inputs,[{front:'f'},{left:'l'}]);
 const inferred=generationRequest({front:'f'},'v3.1-20260211','task_multiview');assert.deepEqual(inferred.body.inputs,[{task_id:'task_multiview'}]);assert.equal(inferred.body.input,undefined);
 let calls=0;const client=new Tripo('test-only',async()=>{calls++;throw new Error('connection lost');});await assert.rejects(()=>client.submit(one.endpoint,one.body));assert.equal(calls,1);
});

test('job state and audit event commit together; stale cancellation cannot replace processing',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'pawprint-state-')),db=openStore(dir);
 try{
  db.prepare('INSERT INTO users VALUES(?,?,?,?)').run('owner','test@example.invalid','disabled',1);
  db.prepare('INSERT INTO jobs(id,user_id,name,status,created,updated) VALUES(?,?,?,?,?,?)').run('job','owner','Mochi','WAITING_APPROVAL',1,1);
  assert.equal(updateJob(db,'job',{status:'PROCESSING',message:'Claimed before provider calls'},{expectedStatus:'WAITING_APPROVAL'}),true);
  assert.equal(updateJob(db,'job',{status:'CANCELLED'},{expectedStatus:'WAITING_APPROVAL'}),false);
  assert.equal(db.prepare('SELECT status FROM jobs WHERE id=?').get('job').status,'PROCESSING');
  db.exec("CREATE TRIGGER reject_audit BEFORE INSERT ON events BEGIN SELECT RAISE(ABORT,'audit unavailable'); END;");
  assert.throws(()=>updateJob(db,'job',{status:'RUNNING',message:'Submitted'}),/audit unavailable/);
  assert.equal(db.prepare('SELECT status FROM jobs WHERE id=?').get('job').status,'PROCESSING');
  assert.equal(db.prepare('SELECT count(*) AS n FROM events').get().n,1);
  db.exec('DROP TRIGGER reject_audit');
  assert.equal(updateJob(db,'job',{status:'CANCELLED'}),true);
  assert.equal(updateJob(db,'job',{status:'PROCESSING'}),false);
  assert.equal(db.prepare('SELECT status FROM jobs WHERE id=?').get('job').status,'CANCELLED');
 }finally{db.close();await rm(dir,{recursive:true,force:true});}
});

test('resuming an in-flight task skips balance checks; new stages require the remaining reservation',async()=>{
 let balanceCalls=0,balance=55;
 const client={request:async endpoint=>{assert.equal(endpoint,'/account/balance');balanceCalls++;return {balance};}};
 const tasks={generation:{id:'already-submitted',output:{model_url:'https://example.invalid/model.glb'},credits:45},rig:{id:'already-running'}};
 await ensureTaskFunding(client,tasks,'rig');assert.equal(balanceCalls,0);
 await ensureTaskFunding(client,tasks,'generation');assert.equal(balanceCalls,0);
 assert.equal(remainingGenerationBudget(tasks),55);
 await ensureTaskFunding(client,tasks,'walk');assert.equal(balanceCalls,1);
 balance=54;await assert.rejects(()=>ensureTaskFunding(client,tasks,'walk'),/API_BALANCE_BELOW_RESERVATION/);assert.equal(balanceCalls,2);
 balance=0;await ensureTaskFunding(client,tasks,'rig');assert.equal(balanceCalls,2);
 for(const credits of [null,undefined,-1,Infinity,NaN,76]){
  tasks.generation.credits=credits;
  await assert.rejects(()=>ensureTaskFunding(client,tasks,'walk'),/BILLING_REVIEW_REQUIRED/);
 }
 assert.equal(balanceCalls,2,'invalid billing fails before any new provider request');
});

test('worker outer error handling preserves an explicit funding pause but fails unrelated errors',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'pawprint-funding-pause-')),db=openStore(dir);
 try{
  db.prepare('INSERT INTO users VALUES(?,?,?,?)').run('owner','funding@example.invalid','disabled',1);
  const data={tasks:{generation:{id:'saved-task',output:{},credits:45}}};
  db.prepare('INSERT INTO jobs(id,user_id,name,status,data,created,updated) VALUES(?,?,?,?,?,?,?)').run('job','owner','Mochi','PROCESSING',JSON.stringify(data),1,1);
  let fundingError;
  try{await ensureTaskFunding({request:async()=>({balance:0})},data.tasks,'rig');}catch(error){fundingError=error;}
  assert.equal(fundingError?.code,'API_BALANCE_BELOW_RESERVATION');
  updateJob(db,'job',{status:'WAITING_APPROVAL',message:'Insufficient balance'});
  const finalize=error=>{const latest=db.prepare('SELECT status FROM jobs WHERE id=?').get('job');if(shouldMarkWorkerFailed(latest.status,error))updateJob(db,'job',{status:'FAILED'});};
  finalize(fundingError);
  assert.equal(db.prepare('SELECT status FROM jobs WHERE id=?').get('job').status,'WAITING_APPROVAL');
  assert.equal(JSON.parse(db.prepare('SELECT data FROM jobs WHERE id=?').get('job').data).tasks.generation.id,'saved-task');
  finalize(new Error('unrelated disk failure'));
  assert.equal(db.prepare('SELECT status FROM jobs WHERE id=?').get('job').status,'FAILED');
  for(const state of ['SUBMISSION_UNCERTAIN','PAUSED_NETWORK','FAILED','CANCELLED','DELETED'])assert.equal(shouldMarkWorkerFailed(state,new Error('unrelated')),false);
 }finally{db.close();await rm(dir,{recursive:true,force:true});}
});
test('GLB structural validation and external URI rejection',()=>{
 function glb(doc){let json=Buffer.from(JSON.stringify(doc));while(json.length%4)json=Buffer.concat([json,Buffer.from(' ')]);const b=Buffer.alloc(20+json.length);b.write('glTF');b.writeUInt32LE(2,4);b.writeUInt32LE(b.length,8);b.writeUInt32LE(json.length,12);b.writeUInt32LE(0x4e4f534a,16);json.copy(b,20);return b;}
 assert.throws(()=>inspectGLB(Buffer.from('bad')),/Invalid/);assert.throws(()=>inspectGLB(glb({images:[{uri:'http://127.0.0.1/private'}]})),/External/);assert.equal(inspectGLB(glb({animations:[{name:'walk'}]})).animations[0],'walk');
});
test('real existing dog model retains four animations',async()=>{const report=inspectGLB(await readFile(new URL('./public/models/lanlao.glb',import.meta.url)));for(const name of ['Walk_Refined','Run_Trot_Natural','Tail_Wag_Natural','Jump_Natural'])assert.ok(report.animations.includes(name));assert.ok(report.skins>0);});
test('dog dialogue returns whitelisted actions without moving for ordinary conversation',()=>{assert.equal(respond('蓝老，跑步').action,'run');assert.equal(respond('停下').sound,null);assert.equal(respond('我今天有点难过').action,null);assert.equal(respond('不要跑步').action,null);});

test('local no-login mode opens workspace but rejects public hosts, proxies and foreign origins',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'lanlao-local-test-'));
 await assert.rejects(()=>makeApp({dataDir:dir,origin:'https://public.example',localMode:true}),/免登录/);
 const {app,db}=await makeApp({dataDir:dir,origin:'http://127.0.0.1:8787',localMode:true,companionAI:async({name,kind})=>({caption:`${name} is a ${kind}`,action:null,sound:null})});const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}`;
 try{
  const me=await (await fetch(base+'/api/me')).json();assert.equal(me.user.local,true);
  assert.equal((await fetch(base+'/api/jobs')).status,200);
  const publicHostStatus=await new Promise((resolve,reject)=>{httpGet(base+'/api/jobs',{headers:{Host:'public.example'}},res=>{res.resume();resolve(res.statusCode);}).on('error',reject);});
  assert.equal(publicHostStatus,403);
  assert.equal((await fetch(base+'/api/jobs',{headers:{'X-Forwarded-For':'1.2.3.4'}})).status,403);
  assert.equal((await fetch(base+'/api/jobs',{method:'POST',headers:{Origin:'https://evil.example'}})).status,403);
  assert.equal((await fetch(base+'/api/login',{method:'POST',headers:{Origin:'http://127.0.0.1:8787','Content-Type':'application/json'},body:'{}'})).status,403);
  const bytes=await sharp({create:{width:300,height:300,channels:3,background:'#bda888'}}).png().toBuffer();const form=new FormData();form.set('name','免登录测试');form.set('species','cat');form.set('consent','yes');form.set('front',new Blob([bytes],{type:'image/png'}),'cat.png');
  const created=await fetch(base+'/api/jobs',{method:'POST',headers:{Origin:'http://127.0.0.1:8787'},body:form});assert.equal(created.status,201);const job=await created.json();assert.equal(job.status,'WAITING_APPROVAL');
  assert.equal(job.species,'cat');
  assert.equal((await fetch(base+`/api/jobs/${job.id}/photo/front`)).status,200);
  const media=new FormData();media.set('file',new Blob([Buffer.from('RIFF0000WAVEfmt ')],{type:'audio/wav'}),'voice.wav');
  assert.equal((await fetch(base+`/api/jobs/${job.id}/reference/audio`,{method:'POST',headers:{Origin:'http://127.0.0.1:8787'},body:media})).status,201);
  assert.equal((await fetch(base+`/api/jobs/${job.id}/reference/audio`)).status,200);
  const videoBytes=Buffer.alloc(16);videoBytes.write('ftyp',4);const video=new FormData();video.set('file',new Blob([videoBytes],{type:'video/mp4'}),'walk.mp4');
  assert.equal((await fetch(base+`/api/jobs/${job.id}/reference/video`,{method:'POST',headers:{Origin:'http://127.0.0.1:8787'},body:video})).status,201);
  const updated=await (await fetch(base+`/api/jobs/${job.id}`)).json();assert.deepEqual(updated.references.sort(),['audio','video']);
  const chat=await fetch(base+'/api/companion/chat',{method:'POST',headers:{Origin:'http://127.0.0.1:8787','Content-Type':'application/json'},body:JSON.stringify({petId:job.id,text:'Hello',history:[]})});assert.match((await chat.json()).caption,/is a cat/);
 }finally{await new Promise(r=>server.close(r));db.close();await rm(dir,{recursive:true,force:true});}
});

test('multipart upload accepts four metadata fields, all photos and generated views with private references',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'pawprint-multipart-')),origin='http://127.0.0.1:8787';
 const {app,db}=await makeApp({dataDir:dir,origin,localMode:true});
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));const base=`http://127.0.0.1:${server.address().port}`;
 const post=(route,body)=>fetch(base+'/api'+route,{method:'POST',headers:{Origin:origin},body});
 try{
  const bytes=await sharp({create:{width:256,height:256,channels:3,background:'white'}}).png().toBuffer();
  for(const mode of ['direct','generated_views']){
   const form=new FormData();form.set('name','Mochi');form.set('species','cat');form.set('consent','yes');form.set('mode',mode);
   for(const view of mode==='direct'?['front','left','back','right']:['front'])form.set(view,new Blob([bytes],{type:'image/png'}),`${view}.png`);
   const response=await post('/jobs',form);assert.equal(response.status,201,await response.clone().text());
   const job=await response.json();assert.equal(job.mode,mode);assert.equal(job.species,'cat');assert.equal(job.views.length,mode==='direct'?4:1);
   const media=new FormData();media.set('file',new Blob([Buffer.from('RIFF0000WAVEfmt ')],{type:'audio/wav'}),'reference.wav');
   assert.equal((await post(`/jobs/${job.id}/reference/audio`,media)).status,201);
   const saved=await fetch(base+`/api/jobs/${job.id}/reference/audio`);assert.equal(saved.status,200);assert.equal(saved.headers.get('cache-control'),'no-store');
  }
 }finally{await new Promise(resolve=>server.close(resolve));db.close();await rm(dir,{recursive:true,force:true});}
});
