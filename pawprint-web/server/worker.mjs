import {readFile,writeFile,rename,open,unlink} from 'node:fs/promises';
import {realpathSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {openStore,updateJob} from './store.mjs';
import {Tripo,TripoError,generationRequest,inspectGLB} from './tripo.mjs';
import {MockTripo} from './mock-tripo.mjs';
import {reserveBudget,remainingGenerationBudget,ensureTaskFunding} from './budget.mjs';
import {shouldMarkWorkerFailed} from './worker-state.mjs';
import sharp from 'sharp';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const RUNNABLE_STATUSES=['WAITING_APPROVAL','RUNNING','QUEUED','PROCESSING','PAUSED_NETWORK'];
export const MOCK_LABEL='示范模式（未调用 Tripo）';
const rerunCodes=['API_BALANCE_BELOW_RESERVATION','TEST_BUDGET_EXCEEDED','TRIPO_BALANCE','TRIPO_AUTH','TRIPO_RATE_LIMIT','TRIPO_SERVER','TRIPO_NETWORK','TRIPO_TIMEOUT','TRIPO_API','TRIPO_BAD_RESPONSE'];
// Operator-facing reasons. Tripo API credits are topped up on the Tripo API platform, separately from Tripo Studio membership credits.
export function providerMessage(error){
 const code=error?.code||error?.message,detail=error?.providerMessage?`（Tripo：${error.providerMessage}）`:'';
 if(code==='API_BALANCE_BELOW_RESERVATION'||code==='TRIPO_BALANCE')return `Tripo API 余额不足（每个任务开始前需至少 100 API credits）。请站长在 Tripo API 平台为 API 账户充值，这不是 Tripo Studio 网页版的会员积分。任务仍保留，充值后可直接重新运行。${detail}`;
 if(code==='TEST_BUDGET_EXCEEDED')return '本机测试预算（TEST_BUDGET_CREDITS）不足，未调用任何收费接口。请站长核对账单后调整预算，再重新运行。';
 if(code==='TRIPO_AUTH')return `Tripo API 密钥无效或没有权限（HTTP ${error.status||'401/403'}）。请站长检查 .env 的 TRIPO_API_KEY，修正后可重新运行。${detail}`;
 if(code==='TRIPO_RATE_LIMIT')return `Tripo 请求过于频繁（HTTP 429），请稍后重新运行。${detail}`;
 if(code==='TRIPO_SERVER')return `Tripo 服务暂时异常（HTTP ${error.status||'5xx'}），请稍后重新运行。${detail}`;
 if(code==='TRIPO_NETWORK'||code==='TRIPO_TIMEOUT')return '无法连接 Tripo（网络中断或超时），请检查网络后重新运行。';
 return `Tripo 拒绝了请求，请站长检查后重新运行。${detail}`;
}
const handled=code=>Object.assign(new Error(code),{code,handled:true});
const transientDownload=error=>!['UNAPPROVED_ASSET_HOST','ASSET_TOO_LARGE'].includes(error?.message);

export async function runJob({db,dataDir,jobId,tripo,options={}}){
 const env=options.env||process.env,mock=!!options.mock,pollMs=options.pollMs??(mock?200:5000);
 const job=db.prepare('SELECT * FROM jobs WHERE id=?').get(jobId||'');
 if(!job||!RUNNABLE_STATUSES.includes(job.status))throw new Error('任务不存在，或当前状态不允许运行。SUBMISSION_UNCERTAIN 必须先人工核对 Tripo 账单。');
 if(!mock&&(!options.confirmCharges||env.ALLOW_PAID_GENERATION!=='true'||!env.TRIPO_API_KEY))throw new Error('尚未授权付费生成。请先配置 .env，并明确确认本任务的 Tripo 费用。');
 let data=JSON.parse(job.data),currentStep=job.step,reservation;
 const taskIds=Object.values(data.tasks||{}).map(t=>t.id);
 // Never mix demo and paid runs: mock task ids are meaningless to Tripo and a mock run must not continue real tasks.
 if(mock&&taskIds.some(id=>!String(id).startsWith('mock-')))throw new Error('此任务已有真实 Tripo 任务编号，不能用示范模式继续。');
 if(!mock&&data.mock)throw new Error('此任务是示范模式产生的，不能用真实 Tripo 继续。请重新创建任务。');
 const dir=path.join(dataDir,'assets',job.id);
 // Mock runs use an offline stand-in: no network, no Tripo request, no charge.
 tripo??=mock?new MockTripo({outDir:path.join(dir,'mock-tripo'),fail:env.TRIPO_MOCK_FAIL||''}):new Tripo(env.TRIPO_API_KEY);
 // A single local process owns generation. A crash leaves a lock for deliberate recovery.
 const lockPath=path.join(dataDir,'worker.lock');
 let lock;try{lock=await open(lockPath,'wx');}catch{throw new Error('已有加工进程，或上次异常退出留下锁文件。请确认无运行进程后再恢复。');}
 if(mock)data.mock=true;
 const save=(status,message)=>{if(!updateJob(db,jobId,{status,step:currentStep,data,message:mock?`【${MOCK_LABEL}】${message}`:message}))throw new Error('TASK_NO_LONGER_ACTIVE');};
 const stop=(status,message,code)=>{save(status,message);return handled(code);};
 // Definite refusals and pre-submission problems keep the job rerunnable; submitted task ids are only ever re-queried.
 const rerunnable=error=>stop(Object.keys(data.tasks||{}).length?'PAUSED_NETWORK':'WAITING_APPROVAL',providerMessage(error),error.code||error.message);
 async function downloadAsset(value,maxBytes){
  if(mock)return tripo.download(value,maxBytes);
  const url=new URL(value);if(url.protocol!=='https:'||url.port||url.username||url.password||!(url.hostname==='tripo3d.ai'||url.hostname.endsWith('.tripo3d.ai')||url.hostname==='tripo-data.rg1.data.tripo3d.com'))throw new Error('UNAPPROVED_ASSET_HOST');
  const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(180000)});
  if(!response.ok||Number(response.headers.get('content-length'))>maxBytes)throw new Error('ASSET_DOWNLOAD_FAILED');
  const chunks=[];let size=0;for await(const chunk of response.body){size+=chunk.length;if(size>maxBytes)throw new Error('ASSET_TOO_LARGE');chunks.push(chunk);}return Buffer.concat(chunks);
 }
 // Output URLs can expire; on a transient download failure drop the cached output so resume re-queries (free) instead of resubmitting.
 async function fetchOutput(record,value,maxBytes){
  try{return await downloadAsset(value,maxBytes);}
  catch(error){if(!transientDownload(error))throw error;delete record.output;throw stop('PAUSED_NETWORK','模型下载中断，任务编号已保存；恢复时只重新查询下载地址，不重复提交。','ASSET_DOWNLOAD_PAUSED');}
 }
 async function task(key,endpoint,body){
  currentStep=key;data.tasks??={};
  try{await ensureTaskFunding(tripo,data.tasks,key,reservation);}
  catch(error){
   if(error.code==='API_BALANCE_BELOW_RESERVATION')throw stop('WAITING_APPROVAL','余额不足，已在下一次提交前暂停；已完成的任务和编号保留，不会重复扣费。','API_BALANCE_BELOW_RESERVATION');
   if(error.message==='BILLING_REVIEW_REQUIRED')throw stop('FAILED','已完成阶段的计费信息无效，停止后续收费步骤，请核对账单。','BILLING_REVIEW_REQUIRED');
   if(error instanceof TripoError&&error.definite)throw rerunnable(error);
   throw stop('PAUSED_NETWORK','余额核对中断；已有任务编号保留，恢复时不会重复提交。','PAUSED_NETWORK');
  }
  if(!data.tasks[key]){
   save('SUBMITTING',mock?`正在模拟提交 ${key}，不会产生费用。`:`正在提交 ${key}，请求可能产生 Tripo 费用。`);
   let taskId;
   try{taskId=await tripo.submit(endpoint,body);}
   catch(error){if(error instanceof TripoError&&error.definite)throw rerunnable(error);throw stop('SUBMISSION_UNCERTAIN','提交结果不确定；已停止自动重试，请站长核对 Tripo 任务和费用。','SUBMISSION_UNCERTAIN');}
   data.tasks[key]={id:taskId};save('RUNNING',`Tripo 正在处理 ${key}。`);
  }
  const record=data.tasks[key];if(record.output)return record;
  save('RUNNING',`等待 Tripo 完成 ${key}。`);
  for(let attempt=0;attempt<720;attempt++){
   let result;try{result=await tripo.query(record.id);}catch(error){throw stop('PAUSED_NETWORK',`查询中断，任务编号已保存；恢复时只查询，不重复提交。${error instanceof TripoError?providerMessage(error):''}`,'PAUSED_NETWORK');}
   if(result.status==='success'){record.output=result.output||{};record.credits=result.credits_consumed??(key==='rig_check'?0:null);save('RUNNING',`${key} 已完成。`);try{remainingGenerationBudget(data.tasks,reservation);}catch{throw stop('FAILED','计费信息缺失或超出预期，已停止后续收费步骤，请核对账单。','BILLING_REVIEW_REQUIRED');}return record;}
   if(['failed','cancelled','banned','expired'].includes(result.status))throw stop('FAILED',`Tripo ${key} 未成功（${result.status}），请站长检查。`,'PROVIDER_FAILED');
   await new Promise(resolve=>setTimeout(resolve,pollMs));
  }
  throw stop('PAUSED_NETWORK','等待超时，任务编号已保存，请稍后恢复查询。','POLL_TIMEOUT');
 }
 try{
  // Claim the task before any provider request. A cancelled/deleted task must
  // never continue from the stale snapshot read before the worker acquired its lock.
  currentStep='upload';save('PROCESSING','正在核对授权和预算，尚未提交付费生成。');
  // Before anything is submitted, confirm the API balance first so a low balance reserves no test budget and leaves the job rerunnable.
  if(!Object.keys(data.tasks||{}).length){const account=await tripo.request('/account/balance');if(typeof account.balance!=='number'||!Number.isFinite(account.balance)||account.balance<100)throw Object.assign(new Error('API_BALANCE_BELOW_RESERVATION'),{code:'API_BALANCE_BELOW_RESERVATION'});}
  // Fixed standard options currently total 65 credits. Reserve 100, never auto-refund. Mock runs cost nothing and reserve nothing.
  if(!mock)reservation=reserveBudget(db,jobId,100,Number(env.TEST_BUDGET_CREDITS||0));
  data.approvedAt??=Date.now();data.tokens??={};save('PROCESSING',mock?'正在模拟上传照片（照片不会离开本机）。':'正在将授权照片上传到 Tripo。');
  for(const [view,file]of Object.entries(data.photos))if(!data.tokens[view]){data.tokens[view]=await tripo.upload(await readFile(path.join(dir,file)),/\.jpe?g$/i.test(file)?'image/jpeg':'image/png');save('PROCESSING',`${view} 照片已上传。`);}
  let viewsTask;
  if(data.mode==='generated_views'){
   viewsTask=await task('multiview','/generation/image-to-multiview',{input:data.tokens.front});
   if(!data.viewsApprovedAt){
    currentStep='view_review';data.generatedViews={};save('PROCESSING','正在保存 AI 四视角，稍后需要你核对毛色与花纹。');
    const viewOutput=viewsTask.output.generate_multiview_image||viewsTask.output;
    for(const view of ['front','left','back','right']){const bytes=await fetchOutput(viewsTask,viewOutput[`${view}_view_url`],20*1024*1024);const file=`generated-${view}.png`;await sharp(bytes,{limitInputPixels:24000000}).rotate().resize(2048,2048,{fit:'inside',withoutEnlargement:true}).png().toFile(path.join(dir,file));data.generatedViews[view]=file;}
    save('VIEW_REVIEW',mock?'示范四视角（由正面照翻转/调色得到，并非 AI 生成）已保存。确认后才继续示范流程。':'AI 四视角已生成。请检查侧面、背面毛色及花纹；确认后才继续生成 3D。');
   }
  }
  if(data.mode!=='generated_views'||data.viewsApprovedAt){
   const request=generationRequest(data.tokens,env.TRIPO_MODEL||'v3.1-20260211',viewsTask?.id);
   const generated=await task('generation',request.endpoint,request.body);
   // Preserve the colored geometry even if later rigging is unsuitable.
   if(!data.baseModelFile){
    const baseBytes=await fetchOutput(generated,generated.output.model_url,150*1024*1024);
    data.baseReport=inspectGLB(baseBytes);await writeFile(path.join(dir,'base-model.glb'),baseBytes);
    data.baseModelFile='base-model.glb';data.modelFile=data.baseModelFile;save('RUNNING','彩色基础模型已保存，接下来检查四足绑定。');
   }
   const checked=await task('rig_check','/animations/rig-check',{input:generated.id});
   if(checked.output.riggable!==true||checked.output.rig_type!=='quadruped'){
    save('REVIEW_REQUIRED','模型未通过四足骨骼检查，已保留彩色基础模型，需要人工检查照片和模型。');
   }else{
    const rigged=await task('rig','/animations/rig',{input:generated.id,model:'v2.5-20260210',rig_type:'quadruped',spec:'tripo',out_format:'glb'});
    const walked=await task('walk','/animations/retarget',{input:rigged.id,animation:'preset:quadruped:walk',out_format:'glb',bake_animation:true,export_with_geometry:true,animate_in_place:true});
    currentStep='download';save('PROCESSING','正在保存带行走动作的模型。');
    const bytes=await fetchOutput(walked,walked.output.model_url,150*1024*1024),report=inspectGLB(bytes);await writeFile(path.join(dir,'model.tmp'),bytes);await rename(path.join(dir,'model.tmp'),path.join(dir,'model.glb'));
    data.modelFile='model.glb';data.report=report;currentStep='local_quality_check';save('PROCESSING','基础模型已保存，正在本机检查骨骼和材质。');
    if(env.BLENDER_PATH&&!options.skipBlender){
     try{await promisify(execFile)(env.BLENDER_PATH,['--background','--factory-startup','--python',path.join(root,'worker','inspect_model.py'),'--',path.join(dir,'model.glb'),path.join(dir,'quality.json')],{timeout:180000,maxBuffer:2*1024*1024,windowsHide:true});data.report.blender=JSON.parse(await readFile(path.join(dir,'quality.json'),'utf8'));}
     catch{data.report.blender={error:'本机 Blender 检查未完成，请人工检查。'};}
    }
    save('REVIEW_REQUIRED',mock?'示范流程已走完：模型是内置示例模型（lanlao-base.glb），并非根据你的照片生成，仅用于演示加工流程。':'基础模型和行走动作已生成。跑步、跳跃、摇尾巴和保色毛发仍需适配与视觉验收，尚未发布为完整宠物。');
   }
  }
  return db.prepare('SELECT status,step,message FROM jobs WHERE id=?').get(jobId);
 }catch(error){
  // Statuses saved at the failure point (SUBMISSION_UNCERTAIN, PAUSED_NETWORK, FAILED, funding pauses) and
  // cancelled/deleted tasks are never overwritten here.
  if(!error.handled){
   const latest=db.prepare('SELECT status FROM jobs WHERE id=?').get(jobId);
   if(shouldMarkWorkerFailed(latest?.status,error)){
    if(error instanceof TripoError||rerunCodes.includes(error.code||error.message))throw rerunnable(error);
    save('FAILED','处理未完成；已有任务编号和模型保留，请站长检查。');
   }
  }
  throw error;
 }finally{await lock.close();await unlink(lockPath);}
}

// Windows may report the same script path with a different drive-letter case.
function invokedDirectly(){try{const a=realpathSync(process.argv[1]),b=realpathSync(fileURLToPath(import.meta.url));return process.platform==='win32'?a.toLowerCase()===b.toLowerCase():a===b;}catch{return false;}}
if(process.argv[1]&&invokedDirectly()){
 await import('dotenv/config');
 const args=process.argv.slice(2),dataDir=path.join(root,'.data'),db=openStore(dataDir);
 const mock=args.includes('--mock')||process.env.TRIPO_MOCK==='true';
 try{const result=await runJob({db,dataDir,jobId:args.find(a=>!a.startsWith('--')),options:{mock,confirmCharges:args.includes('--confirm-tripo-charges'),skipBlender:args.includes('--skip-blender')}});console.log(`${mock?`【${MOCK_LABEL}】`:''}处理完成：${result.status}。查看网站任务状态。`);}
 catch(error){console.error('加工停止：',error.message);process.exitCode=1;}
 finally{db.close();}
}
