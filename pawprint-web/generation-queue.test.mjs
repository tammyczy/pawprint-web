import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {openStore,updateJob} from './server/store.mjs';
import {startGenerationQueue,stopServerAndQueue} from './server/generation-queue.mjs';
import {runJob} from './server/worker.mjs';

async function setup(jobs){
 const dataDir=await mkdtemp(path.join(tmpdir(),'pawprint-queue-test-'));
 const db=openStore(dataDir);
 db.prepare('INSERT INTO users(id,email,password,created) VALUES(?,?,?,?)').run('test-user','queue@example.test','disabled',1);
 const insert=db.prepare('INSERT INTO jobs(id,user_id,name,status,data,message,created,updated) VALUES(?,?,?,?,?,?,?,?)');
 jobs.forEach(([id,status],i)=>insert.run(id,'test-user','Example',status,'{}','',i+1,i+1));
 return {dataDir,db,cleanup:async()=>{db.close();await rm(dataDir,{recursive:true,force:true});}};
}

test('restart requires manual billing review for uncertain submissions and requeues recoverable jobs',async()=>{
 const t=await setup([['submitting','SUBMITTING'],['running','RUNNING'],['processing','PROCESSING'],['completed','REVIEW_REQUIRED'],['cancelled','CANCELLED']]);
 let stop;
 try{
  stop=startGenerationQueue({db:t.db,dataDir:t.dataDir,intervalMs:60000,run:async()=>{throw new Error('should not run');}});
  const status=id=>t.db.prepare('SELECT status FROM jobs WHERE id=?').get(id).status;
  assert.equal(status('submitting'),'SUBMISSION_UNCERTAIN');
  assert.equal(status('running'),'QUEUED');
  assert.equal(status('processing'),'QUEUED');
  assert.equal(status('completed'),'REVIEW_REQUIRED');
  assert.equal(status('cancelled'),'CANCELLED');
  const events=t.db.prepare('SELECT status FROM events WHERE job_id=?').all('submitting');
  assert.deepEqual(events.map(e=>e.status),['SUBMISSION_UNCERTAIN']);
 }finally{await stop?.();await t.cleanup();}
});

test('queue runs only one job at a time and shutdown waits for the active job',{timeout:3000},async()=>{
 const t=await setup([['first','QUEUED'],['second','QUEUED'],['uncertain','SUBMISSION_UNCERTAIN'],['manual','WAITING_APPROVAL']]);
 let resolveFirst,resolveSecond,firstStarted,secondStarted;
 const startedFirst=new Promise(resolve=>firstStarted=resolve),startedSecond=new Promise(resolve=>secondStarted=resolve);
 const gate=new Promise(resolve=>resolveFirst=resolve),secondGate=new Promise(resolve=>resolveSecond=resolve),calls=[];
 const run=async({jobId,options})=>{
  calls.push({jobId,options});
  updateJob(t.db,jobId,{status:'PROCESSING'},{expectedStatus:'QUEUED'});
  if(jobId==='first'){firstStarted();await gate;}else {secondStarted();await secondGate;}
  updateJob(t.db,jobId,{status:'REVIEW_REQUIRED'},{expectedStatus:'PROCESSING'});
 };
 let stop,done;
 try{
  stop=startGenerationQueue({db:t.db,dataDir:t.dataDir,intervalMs:5,run});
  await startedFirst;
  await new Promise(resolve=>setTimeout(resolve,30));
  assert.deepEqual(calls.map(x=>x.jobId),['first']);
  resolveFirst();
  await startedSecond;
  let stopped=false;done=stop().then(()=>{stopped=true;});
  await new Promise(resolve=>setTimeout(resolve,20));
  assert.equal(stopped,false,'shutdown should wait for the active worker');
  await assert.rejects(()=>startAnotherWorker(t),/锁文件/);
  resolveSecond();
  await done;
  assert.deepEqual(calls.map(x=>x.jobId),['first','second']);
  assert.ok(calls.every(x=>x.options.confirmCharges===true&&x.options.singleProcessQueue===true));
  assert.equal(t.db.prepare('SELECT status FROM jobs WHERE id=?').get('uncertain').status,'SUBMISSION_UNCERTAIN');
 }finally{resolveFirst();resolveSecond();if(stop)await (done||stop());await t.cleanup();}
});

async function startAnotherWorker(t){
 return runJob({db:t.db,dataDir:t.dataDir,jobId:'manual',options:{mock:true}});
}

test('an existing worker lock prevents recovery or a second worker',{timeout:3000},async()=>{
 const t=await setup([['uncertain','SUBMITTING'],['manual','WAITING_APPROVAL']]);
 try{
  const lock=path.join(t.dataDir,'worker.lock');await writeFile(lock,'existing owner');
  assert.throws(()=>startGenerationQueue({db:t.db,dataDir:t.dataDir,intervalMs:5}),/锁文件/);
  assert.equal(t.db.prepare('SELECT status FROM jobs WHERE id=?').get('uncertain').status,'SUBMITTING');
  await access(lock);
 }finally{await t.cleanup();}
});

test('the queue owns the same lock as the manual worker for its entire lifetime',{timeout:3000},async()=>{
 const t=await setup([['manual','WAITING_APPROVAL']]);
 let stop;
 try{
  stop=startGenerationQueue({db:t.db,dataDir:t.dataDir,intervalMs:60000});
  assert.throws(()=>startGenerationQueue({db:t.db,dataDir:t.dataDir,intervalMs:60000}),/锁文件/);
  await assert.rejects(()=>startAnotherWorker(t),/锁文件/);
  await stop();stop=null;
  await assert.rejects(()=>access(path.join(t.dataDir,'worker.lock')),{code:'ENOENT'});
 }finally{await stop?.();await t.cleanup();}
});

test('queue startup failures release the lock they acquired',async()=>{
 const t=await setup([]);
 try{
  assert.throws(()=>startGenerationQueue({db:{prepare(){throw new Error('database unavailable');}},dataDir:t.dataDir}),/database unavailable/);
  await assert.rejects(()=>access(path.join(t.dataDir,'worker.lock')),{code:'ENOENT'});
 }finally{await t.cleanup();}
});

test('queue shutdown does not delete a replacement lock owned by someone else',async()=>{
 const t=await setup([]);
 let stop;
 try{
  stop=startGenerationQueue({db:t.db,dataDir:t.dataDir,intervalMs:60000});
  const lock=path.join(t.dataDir,'worker.lock');
  await rm(lock);
  await writeFile(lock,'replacement owner');
  await stop();stop=null;
  await access(lock);
 }finally{await stop?.();await t.cleanup();}
});

test('manual worker reads job status after acquiring the lock, not from a stale snapshot',async()=>{
 const t=await setup([['job','QUEUED']]);
 let providerCalls=0;
 try{
  const run=runJob({db:t.db,dataDir:t.dataDir,jobId:'job',options:{mock:true},tripo:{request:async()=>{providerCalls++;return {balance:100};}}});
  updateJob(t.db,'job',{status:'REVIEW_REQUIRED'},{expectedStatus:'QUEUED'});
  await assert.rejects(run,/不允许运行/);
  assert.equal(providerCalls,0);
  assert.equal(t.db.prepare('SELECT status FROM jobs WHERE id=?').get('job').status,'REVIEW_REQUIRED');
  await assert.rejects(()=>access(path.join(t.dataDir,'worker.lock')),{code:'ENOENT'});
 }finally{await t.cleanup();}
});

test('manual worker does not delete a replacement lock',async()=>{
 const t=await setup([['job','WAITING_APPROVAL']]);
 let entered,release;
 const active=new Promise(resolve=>entered=resolve),gate=new Promise(resolve=>release=resolve);
 const tripo={request:async()=>{entered();await gate;return {balance:0};}};
 try{
  const run=runJob({db:t.db,dataDir:t.dataDir,jobId:'job',options:{mock:true},tripo});
  await active;
  const lock=path.join(t.dataDir,'worker.lock');await rm(lock);await writeFile(lock,'replacement owner');
  release();await assert.rejects(run,/API_BALANCE_BELOW_RESERVATION/);
  await access(lock);
 }finally{release();await t.cleanup();}
});

test('server shutdown stops scheduling immediately and waits for HTTP and worker before closing database',async()=>{
 const calls=[];let finishWorker,finishHttp;
 const worker=new Promise(resolve=>finishWorker=resolve);
 const closing=stopServerAndQueue({
  stopQueue:()=>{calls.push('stop queue');return worker;},
  server:{close:callback=>{calls.push('close HTTP');finishHttp=callback;}},
  db:{close:()=>calls.push('close database')}
 });
 assert.deepEqual(calls,['stop queue','close HTTP']);
 finishHttp();await Promise.resolve();
 assert.deepEqual(calls,['stop queue','close HTTP']);
 finishWorker();await closing;
 assert.deepEqual(calls,['stop queue','close HTTP','close database']);
});
