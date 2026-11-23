import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,rm,writeFile,readFile,access} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
import {openStore} from './server/store.mjs';
import {runJob,MOCK_LABEL} from './server/worker.mjs';
import {Tripo,TripoError,inspectGLB} from './server/tripo.mjs';
import {MockTripo} from './server/mock-tripo.mjs';
import {LANLAO_MOTION_CLIPS} from './server/lanlao-motion.mjs';

const exists=file=>access(file).then(()=>true,()=>false);
async function setup(mode='direct'){
 const dataDir=await mkdtemp(path.join(os.tmpdir(),'pawprint-worker-')),db=openStore(dataDir),id=`job-${mode}`,dir=path.join(dataDir,'assets',id);
 await mkdir(dir,{recursive:true});await writeFile(path.join(dir,'front.png'),await sharp({create:{width:600,height:400,channels:3,background:'#c8a070'}}).png().toBuffer());
 db.prepare('INSERT INTO users(id,email,password,created) VALUES(?,?,?,?)').run('u','u@example.test','x',Date.now());
 db.prepare('INSERT INTO jobs(id,user_id,name,status,data,message,created,updated) VALUES(?,?,?,?,?,?,?,?)').run(id,'u','测试','WAITING_APPROVAL',JSON.stringify({photos:{front:'front.png'},mode,species:'dog'}),'',Date.now(),Date.now());
 const row=()=>{const j=db.prepare('SELECT * FROM jobs WHERE id=?').get(id);return {...j,data:JSON.parse(j.data)};};
 const run=(fail='',extra={})=>runJob({db,dataDir,jobId:id,options:{mock:true,pollMs:1,env:{TRIPO_MOCK_FAIL:fail}},...extra});
 return {dataDir,db,id,dir,row,run,cleanup:async()=>{db.close();await rm(dataDir,{recursive:true,force:true});}};
}

test('mock direct run reaches REVIEW_REQUIRED with a walking model, labelled as demo, no budget or lock left',async()=>{
 const t=await setup();
 try{
  const result=await t.run();assert.equal(result.status,'REVIEW_REQUIRED');
  const job=t.row();assert.equal(job.data.mock,true);assert.ok(job.message.includes(MOCK_LABEL));assert.match(job.message,/并非根据你的照片生成/);
  assert.equal(job.data.modelFile,'model.glb');assert.ok(job.data.report.animations.includes('Walk_Refined'));assert.ok(job.data.report.skins>0);
  assert.ok(inspectGLB(await readFile(path.join(t.dir,'model.glb'))).meshes>0);assert.ok(await exists(path.join(t.dir,'base-model.glb')));
  assert.deepEqual(Object.keys(job.data.tasks),['generation','rig_check','rig','walk']);for(const task of Object.values(job.data.tasks)){assert.match(task.id,/^mock-/);assert.equal(task.credits,0);}
  assert.equal(t.db.prepare('SELECT count(*) AS n FROM budget_reservations').get().n,0);assert.equal(await exists(path.join(t.dataDir,'worker.lock')),false);
  for(const e of t.db.prepare('SELECT message FROM events WHERE job_id=?').all(t.id))assert.ok(e.message.includes(MOCK_LABEL));
  await assert.rejects(()=>t.run(),/不允许运行/);
  await assert.rejects(()=>runJob({db:t.db,dataDir:t.dataDir,jobId:t.id,options:{env:{}}}),/不允许运行|尚未授权/);
 }finally{await t.cleanup();}
});

test('mock generated_views run pauses at VIEW_REVIEW with four labelled views, then finishes after approval',async()=>{
 const t=await setup('generated_views');
 try{
  assert.equal((await t.run()).status,'VIEW_REVIEW');let job=t.row();
  assert.deepEqual(Object.keys(job.data.generatedViews),['front','left','back','right']);assert.equal(job.data.tasks.generation,undefined);assert.match(job.message,/并非 AI 生成/);
  for(const file of Object.values(job.data.generatedViews))assert.equal((await sharp(path.join(t.dir,file)).metadata()).width,1024);
  await assert.rejects(()=>t.run(),/不允许运行/);
  const multiviewId=job.data.tasks.multiview.id;job.data.viewsApprovedAt=Date.now();
  t.db.prepare('UPDATE jobs SET status=?,data=? WHERE id=?').run('WAITING_APPROVAL',JSON.stringify(job.data),t.id);
  assert.equal((await t.run()).status,'REVIEW_REQUIRED');job=t.row();
  assert.equal(job.data.tasks.multiview.id,multiviewId);assert.equal(job.data.modelFile,'model.glb');assert.ok(await exists(path.join(t.dir,'model.glb')));
 }finally{await t.cleanup();}
});

test('the reviewed path sends the real front photo and only selected AI views',async()=>{
 const t=await setup('generated_views');
 try{
  const provider=new MockTripo({outDir:path.join(t.dir,'mock-tripo'),sampleGLB:fileURLToPath(new URL('./models/silver-fold-cat/base-model.glb',import.meta.url))});
  const calls=[],submit=provider.submit.bind(provider);
  provider.submit=(endpoint,body)=>{calls.push({endpoint,body});return submit(endpoint,body);};
  const result=await t.run('',{tripo:provider});assert.equal(result.status,'VIEW_REVIEW');
  const {data}=t.row();data.viewsApprovedAt=Date.now();data.approvedSyntheticViews=['back'];data.modelProfile='detail';
  t.db.prepare('UPDATE jobs SET status=?,data=? WHERE id=?').run('WAITING_APPROVAL',JSON.stringify(data),t.id);
  assert.equal((await t.run('',{tripo:provider})).status,'REVIEW_REQUIRED');
  const job=t.row(),generation=calls.find(call=>call.endpoint==='/generation/multiview-to-model');
  assert.deepEqual(generation.body.inputs,[{front:data.tokens.front},{back:job.data.generatedTokens.back}]);
  assert.deepEqual(Object.keys(job.data.generatedTokens),['back']);
  assert.equal(generation.body.geometry_quality,'detailed');
  assert.equal(job.data.modelReview.result,'invalid_walk');
  assert.ok(job.data.modelReview.issues.includes('no_walk'));
  assert.equal(job.data.modelFile,'base-model.glb');
  assert.equal(await exists(path.join(t.dir,'model.glb')),false);
  assert.equal(job.data.previewFile,'model-preview.glb');
 }finally{await t.cleanup();}
});

test('a broken base model stops before rigging and stays out of the preview',async()=>{
 const t=await setup();
 try{
  const broken=path.join(t.dir,'broken.glb');await writeFile(broken,'invalid GLB');
  const provider=new MockTripo({outDir:path.join(t.dir,'mock-tripo'),sampleGLB:broken});
  assert.equal((await t.run('',{tripo:provider})).status,'REVIEW_REQUIRED');
  const {data}=t.row();
  assert.deepEqual(Object.keys(data.tasks),['generation']);
  assert.equal(data.modelReview.result,'invalid_base');
  assert.equal(data.modelFile,undefined);
 }finally{await t.cleanup();}
});

test('a new provider rig receives Lanlao motions locally and the download contains the full set',async t=>{
 const run=await setup();
 const base=await readFile(new URL('./models/silver-fold-cat/base-model.glb',import.meta.url));
 const rig=await readFile(new URL('./models/silver-fold-cat/model.glb',import.meta.url));
 const origin='https://openapi-dl.data.tripo3d.com';
 const calls=[];
 const tripo={
  request:async()=>({balance:500}),
  upload:async()=>'provider-photo',
  submit:async endpoint=>{calls.push(endpoint);return endpoint;},
  query:async endpoint=>{
   const rigged=endpoint==='/animations/rig';
   const check=endpoint==='/animations/rig-check';
   return {status:'success',credits_consumed:check?0:rigged?25:30,
    output:check?{riggable:true,rig_type:'quadruped'}:{model_url:`${origin}/${rigged?'rig':'base'}.glb`}};
  },
 };
 t.mock.method(globalThis,'fetch',async (url,options)=>{
  assert.equal(url.origin,origin);
  assert.equal(options.redirect,'error');
  return new Response(url.pathname==='/rig.glb'?rig:base);
 });
 try{
  const env={ALLOW_PAID_GENERATION:'true',TRIPO_API_KEY:'test-only',TEST_BUDGET_CREDITS:'100'};
  await runJob({db:run.db,dataDir:run.dataDir,jobId:run.id,tripo,options:{env,confirmCharges:true,skipBlender:true}});
  assert.deepEqual(calls,['/generation/image-to-model','/animations/rig-check','/animations/rig']);
  const {data}=run.row();
  assert.equal(data.modelReview.result,'animated');
  assert.equal(data.report.motionTemplate,'lanlao');
  assert.equal(data.report.validation.errors,0);
  assert.deepEqual(inspectGLB(await readFile(path.join(run.dir,data.modelFile))).animations,LANLAO_MOTION_CLIPS);
 }finally{await run.cleanup();}
});

test('mock failure drills leave clear, correctly rerunnable statuses',async()=>{
 for(const [fail,status,pattern,rerun] of [['balance','WAITING_APPROVAL',/API 余额不足.*不是 Tripo Studio/,'REVIEW_REQUIRED'],['auth','WAITING_APPROVAL',/密钥无效/,'REVIEW_REQUIRED'],['submit','SUBMISSION_UNCERTAIN',/提交结果不确定/,null],['network','PAUSED_NETWORK',/只查询，不重复提交/,'REVIEW_REQUIRED'],['generation','FAILED',/generation 未成功/,null],['billing','FAILED',/计费信息/,null]]){
  const t=await setup();
  try{
   await assert.rejects(()=>t.run(fail));const job=t.row();assert.equal(job.status,status,fail);assert.match(job.message,pattern,fail);assert.ok(job.message.includes(MOCK_LABEL));
   assert.equal(await exists(path.join(t.dataDir,'worker.lock')),false);
   const before=job.data.tasks?.generation?.id;
   if(rerun){assert.equal((await t.run()).status,rerun,fail);if(before)assert.equal(t.row().data.tasks.generation.id,before,'resume must not resubmit');}
   else await assert.rejects(()=>t.run(),/不允许运行/);
  }finally{await t.cleanup();}
 }
 const t=await setup();
 try{
  assert.equal((await t.run('rig_check')).status,'REVIEW_REQUIRED');const job=t.row();
  assert.match(job.message,/未通过四足骨骼检查/);assert.equal(job.data.modelFile,'base-model.glb');assert.ok(await exists(path.join(t.dir,'base-model.glb')));assert.equal(await exists(path.join(t.dir,'model.glb')),false);assert.equal(job.data.tasks.rig,undefined);
 }finally{await t.cleanup();}
 assert.throws(()=>new MockTripo({outDir:os.tmpdir(),fail:'typo'}),/TRIPO_MOCK_FAIL/);
});

test('mock downloads only read its own files and the sample model',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'pawprint-mock-'));
 try{const mock=new MockTripo({outDir:dir});await assert.rejects(()=>mock.download('https://tripo3d.ai/x.glb',10),/UNAPPROVED/);await assert.rejects(()=>mock.download('file:///etc/passwd',10),/UNAPPROVED/);await assert.rejects(()=>mock.download(new URL('./package.json',import.meta.url).href,1e6),/UNAPPROVED/);}
 finally{await rm(dir,{recursive:true,force:true});}
});

test('real mode refuses without authorisation, refuses mock jobs and existing locks',async()=>{
 const t=await setup(),env={ALLOW_PAID_GENERATION:'true',TRIPO_API_KEY:'test-only',TEST_BUDGET_CREDITS:'500'};
 try{
  await assert.rejects(()=>runJob({db:t.db,dataDir:t.dataDir,jobId:t.id,options:{env}}),/尚未授权/);
  await assert.rejects(()=>runJob({db:t.db,dataDir:t.dataDir,jobId:t.id,options:{env:{...env,ALLOW_PAID_GENERATION:'false'},confirmCharges:true}}),/尚未授权/);
  await writeFile(path.join(t.dataDir,'worker.lock'),'');await assert.rejects(()=>t.run(),/锁文件/);assert.equal(t.row().status,'WAITING_APPROVAL');await rm(path.join(t.dataDir,'worker.lock'));
  await assert.rejects(()=>t.run('network'));assert.equal(t.row().status,'PAUSED_NETWORK');
  await assert.rejects(()=>runJob({db:t.db,dataDir:t.dataDir,jobId:t.id,options:{env,confirmCharges:true},tripo:{}}),/示范模式产生/);
 }finally{await t.cleanup();}
});

test('real mode: low API balance and definite refusals keep the job rerunnable without reserving budget',async()=>{
 const env={ALLOW_PAID_GENERATION:'true',TRIPO_API_KEY:'test-only',TEST_BUDGET_CREDITS:'500'},options={env,confirmCharges:true,pollMs:1};
 let t=await setup();
 try{
  await assert.rejects(()=>runJob({db:t.db,dataDir:t.dataDir,jobId:t.id,options,tripo:{request:async()=>({balance:0})}}),/API_BALANCE_BELOW_RESERVATION/);
  let job=t.row();assert.equal(job.status,'WAITING_APPROVAL');assert.match(job.message,/API 余额不足/);assert.doesNotMatch(job.message,/示范/);assert.equal(t.db.prepare('SELECT count(*) AS n FROM budget_reservations').get().n,0);
  const refused={request:async()=>({balance:500}),upload:async()=>'file_1',submit:async()=>{throw new TripoError('TRIPO_BALANCE',{status:402,definite:true,providerMessage:'Insufficient credit'});}};
  await assert.rejects(()=>runJob({db:t.db,dataDir:t.dataDir,jobId:t.id,options,tripo:refused}));
  job=t.row();assert.equal(job.status,'WAITING_APPROVAL');assert.match(job.message,/余额不足.*Insufficient credit/);assert.equal(job.data.tasks.generation,undefined);
  const uncertain={...refused,submit:async()=>{throw new TripoError('TRIPO_SERVER',{status:502});}};
  await assert.rejects(()=>runJob({db:t.db,dataDir:t.dataDir,jobId:t.id,options,tripo:uncertain}));assert.equal(t.row().status,'SUBMISSION_UNCERTAIN');
 }finally{await t.cleanup();}
 t=await setup();
 try{
  const stub={request:async()=>({balance:500}),upload:async()=>'file_1',submit:async()=>'task_1',query:async()=>({status:'success',credits_consumed:30,output:{model_url:'http://127.0.0.1/evil.glb'}})};
  await assert.rejects(()=>runJob({db:t.db,dataDir:t.dataDir,jobId:t.id,options,tripo:stub}),/UNAPPROVED_ASSET_HOST/);assert.equal(t.row().status,'FAILED');
 }finally{await t.cleanup();}
});

test('Tripo client maps HTTP and API errors to codes without leaking the key',async()=>{
 const key='tsk_secret_value_123';
 const reply=(status,body)=>async()=>new Response(typeof body==='string'?body:JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
 const fail=async(status,body)=>{try{await new Tripo(key,reply(status,body)).request('/account/balance');}catch(error){return error;}assert.fail('expected rejection');};
 let e=await fail(401,{code:1002,message:`bad key ${key}`});assert.equal(e.code,'TRIPO_AUTH');assert.equal(e.definite,true);assert.doesNotMatch(e.message+e.providerMessage,/secret_value/);
 assert.equal((await fail(403,'forbidden')).code,'TRIPO_AUTH');
 e=await fail(429,{code:2000,message:'Too many requests'});assert.equal(e.code,'TRIPO_RATE_LIMIT');assert.equal(e.apiCode,2000);
 e=await fail(503,'<html>down</html>');assert.equal(e.code,'TRIPO_SERVER');assert.equal(e.definite,false);
 e=await fail(200,{code:2010,message:'Insufficient balance <script>\n'+'x'.repeat(400)});assert.equal(e.code,'TRIPO_BALANCE');assert.equal(e.definite,true);assert.ok(e.providerMessage.length<=160);assert.doesNotMatch(e.providerMessage,/[<>\n]/);
 e=await fail(400,{code:1004,message:'bad parameter'});assert.equal(e.code,'TRIPO_API');assert.equal(e.definite,true);
 e=await fail(200,'not json');assert.equal(e.code,'TRIPO_BAD_RESPONSE');
 e=await new Tripo(key,async()=>{throw new TypeError('fetch failed');}).request('/x').catch(x=>x);assert.equal(e.code,'TRIPO_NETWORK');assert.equal(e.definite,false);
 assert.deepEqual(await new Tripo(key,reply(200,{code:0,data:{balance:5}})).request('/account/balance'),{balance:5});
});
