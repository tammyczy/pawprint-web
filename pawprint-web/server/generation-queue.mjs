import {updateJob} from './store.mjs';
import {runJob} from './worker.mjs';
import {openSync,closeSync,fstatSync,statSync,unlinkSync} from 'node:fs';
import path from 'node:path';

// Stop dispatching before waiting on HTTP connections, but keep the database
// open until both HTTP requests and the currently active worker have finished.
export async function stopServerAndQueue({server,stopQueue,db}){
 let queueClosed;
 try{queueClosed=Promise.resolve(stopQueue());}catch(error){queueClosed=Promise.reject(error);}
 const httpClosed=new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
 const results=await Promise.allSettled([queueClosed,httpClosed]);
 db.close();
 const failed=results.find(result=>result.status==='rejected');
 if(failed)throw failed.reason;
}

export function startGenerationQueue({db,dataDir,run=runJob,intervalMs=2000}){
 // Hold the same lock as the manual worker for the queue's whole lifetime.
 // A crash leaves a lock for deliberate operator recovery, never automatic removal.
 const lockPath=path.join(dataDir,'worker.lock');
 let lock;
 try{lock=openSync(lockPath,'wx');}
 catch(error){
  if(error.code==='EEXIST')throw new Error('已有加工进程，或上次异常退出留下锁文件。请确认无运行进程并核对账单后再恢复。');
  throw error;
 }
 let released=false;
 const release=()=>{
  if(released)return;
  released=true;
  try{
   const own=fstatSync(lock);
   try{const current=statSync(lockPath);if(current.dev===own.dev&&current.ino===own.ino)unlinkSync(lockPath);}
   catch(error){if(error.code!=='ENOENT')throw error;}
  }finally{closeSync(lock);}
 };
 try{
 // Recovery must happen only after exclusive ownership of the worker lock.
 for(const job of db.prepare("SELECT id,status FROM jobs WHERE status IN ('SUBMITTING','RUNNING','PROCESSING')").all()){
  const uncertain=job.status==='SUBMITTING';
  updateJob(db,job.id,{
   status:uncertain?'SUBMISSION_UNCERTAIN':'QUEUED',
   message:uncertain?'提交时服务中断，需先核对 Tripo 任务和费用。':'服务重启，任务已重新排队。'
  },{expectedStatus:job.status});
 }
 const nextJob=db.prepare("SELECT id FROM jobs WHERE status='QUEUED' ORDER BY updated,id LIMIT 1");
 let active;
 const timer=setInterval(()=>{
  if(active)return;
  const job=nextJob.get();
  if(!job)return;
  active=run({db,dataDir,jobId:job.id,options:{confirmCharges:true,singleProcessQueue:true}})
   .catch(error=>console.error('Generation stopped',job.id,error.code||error.name))
   .finally(()=>{active=null;});
 },intervalMs);
 let stopping;
 return ()=>stopping??=(async()=>{
  clearInterval(timer);
  try{await active;}finally{release();}
 })();
 }catch(error){release();throw error;}
}
