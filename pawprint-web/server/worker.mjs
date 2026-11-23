import {readFile,writeFile,rename,open,unlink,stat} from 'node:fs/promises';
import {realpathSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {openStore,updateJob} from './store.mjs';
import {Tripo,TripoError,generationRequest} from './tripo.mjs';
import {MockTripo} from './mock-tripo.mjs';
import {reserveBudget,remainingGenerationBudget,ensureTaskFunding} from './budget.mjs';
import {shouldMarkWorkerFailed} from './worker-state.mjs';
import {DEFAULT_TRIPO_MODEL,PHOTO_VIEWS,modelingPlan} from './modeling-plan.mjs';
import {assessModel} from './model-quality.mjs';
import {bakeLanlaoMotion} from './lanlao-motion.mjs';
import {buildModelPreview,MAX_PREVIEW_SOURCE_BYTES} from './model-textures.mjs';
import sharp from 'sharp';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const RUNNABLE_STATUSES=['WAITING_APPROVAL','RUNNING','QUEUED','PROCESSING','PAUSED_NETWORK'];
export const MOCK_LABEL='示范模式（未调用 Tripo）';
const rerunCodes=['API_BALANCE_BELOW_RESERVATION','TEST_BUDGET_EXCEEDED','TRIPO_BALANCE','TRIPO_AUTH','TRIPO_RATE_LIMIT','TRIPO_SERVER','TRIPO_NETWORK','TRIPO_TIMEOUT','TRIPO_API','TRIPO_BAD_RESPONSE'];
// Operator-facing reasons. Tripo API credits are topped up on the Tripo API platform, separately from Tripo Studio membership credits.
export function providerMessage(error){
 const code=error?.code||error?.message,detail=error?.providerMessage?`（Tripo：${error.providerMessage}）`:'';
 if(code==='API_BALANCE_BELOW_RESERVATION'||code==='TRIPO_BALANCE')return `Tripo API 余额不足（本任务预留 ${error.reservation??100} API credits）。请站长在 Tripo API 平台为 API 账户充值，这不是 Tripo Studio 网页版的会员积分。任务仍保留，充值后可直接重新运行。${detail}`;
 if(code==='TEST_BUDGET_EXCEEDED')return '本机测试预算（TEST_BUDGET_CREDITS）不足，未调用任何收费接口。请站长核对账单后调整预算，再重新运行。';
 if(code==='TRIPO_AUTH')return `Tripo API 密钥无效或没有权限（HTTP ${error.status||'401/403'}）。请站长检查 .env 的 TRIPO_API_KEY，修正后可重新运行。${detail}`;
 if(code==='TRIPO_RATE_LIMIT')return `Tripo 请求过于频繁（HTTP 429），请稍后重新运行。${detail}`;
 if(code==='TRIPO_SERVER')return `Tripo 服务暂时异常（HTTP ${error.status||'5xx'}），请稍后重新运行。${detail}`;
 if(code==='TRIPO_NETWORK'||code==='TRIPO_TIMEOUT')return '无法连接 Tripo（网络中断或超时），请检查网络后重新运行。';
 return `Tripo 拒绝了请求，请站长检查后重新运行。${detail}`;
}
const handled=code=>Object.assign(new Error(code),{code,handled:true});
const unavailableAsset=new Set(['UNAPPROVED_ASSET_HOST','ASSET_TOO_LARGE','ASSET_MISSING']);
const tripoAssetHosts=new Set(['tripo3d.ai','tripo-data.rg1.data.tripo3d.com','openapi-dl.data.tripo3d.com']);
const maxModelBytes=150*1024*1024;
const reviewMessages={
 invalid_base:'基础模型无法通过网页验收。已停止后续骨骼与动作生成，请站长核对候选模型。',
 no_coat:'基础模型缺少可用的毛色贴图或顶点颜色。已保留静态预览，等待检查。',
 anatomy_review:'基础网格在地面附近检测到疑似多余肢体，已保留静态模型供复核。',
 rig_unavailable:'模型未通过四足骨骼检查，已保留彩色基础模型，需要人工检查照片和模型。',
 rig_failed:'四足绑定或行走处理失败。彩色基础模型可继续预览。',
 motion_review:'骨架无法适配蓝老动作，已保留彩色基础模型。',
 invalid_walk:'行走模型未通过技术验收。已保留彩色基础模型。',
 animated:'彩色模型已通过网页和骨骼动作检查。请核对毛色、体型与行走效果。',
};

export async function runJob({db,dataDir,jobId,tripo,options={}}){
 const env=options.env||process.env,mock=!!options.mock,pollMs=options.pollMs??(mock?200:5000);
 // A manual worker acquires the shared lock before reading any task state.
 // Otherwise an async lock acquisition could leave it with a stale pre-lock snapshot.
 const lockPath=path.join(dataDir,'worker.lock');
 let lock;
 if(!options.singleProcessQueue){
  try{lock=await open(lockPath,'wx');}catch{throw new Error('已有加工进程，或上次异常退出留下锁文件。请确认无运行进程后再恢复。');}
 }
 try{
 const job=db.prepare('SELECT * FROM jobs WHERE id=?').get(jobId||'');
 if(!job||!RUNNABLE_STATUSES.includes(job.status))throw new Error('任务不存在，或当前状态不允许运行。SUBMISSION_UNCERTAIN 必须先人工核对 Tripo 账单。');
 if(!mock&&(!options.confirmCharges||env.ALLOW_PAID_GENERATION!=='true'||!env.TRIPO_API_KEY))throw new Error('尚未授权付费生成。请先配置 .env，并明确确认本任务的 Tripo 费用。');
 let data=JSON.parse(job.data),currentStep=job.step,reservation;
 const plan=modelingPlan(data.modelProfile,data.mode,{legacyWalk:mock||!!data.tasks?.walk});
 const taskIds=Object.values(data.tasks||{}).map(t=>t.id);
 // Never mix demo and paid runs: mock task ids are meaningless to Tripo and a mock run must not continue real tasks.
 if(mock&&taskIds.some(id=>!String(id).startsWith('mock-')))throw new Error('此任务已有真实 Tripo 任务编号，不能用示范模式继续。');
 if(!mock&&data.mock)throw new Error('此任务是示范模式产生的，不能用真实 Tripo 继续。请重新创建任务。');
 const dir=path.join(dataDir,'assets',job.id);
 // Mock runs use an offline stand-in: no network, no Tripo request, no charge.
 tripo??=mock?new MockTripo({outDir:path.join(dir,'mock-tripo'),fail:env.TRIPO_MOCK_FAIL||''}):new Tripo(env.TRIPO_API_KEY);
 if(mock)data.mock=true;
 const save=(status,message)=>{if(!updateJob(db,jobId,{status,step:currentStep,data,message:mock?`【${MOCK_LABEL}】${message}`:message}))throw new Error('TASK_NO_LONGER_ACTIVE');};
 const stop=(status,message,code)=>{save(status,message);return handled(code);};
 // Definite refusals and pre-submission problems keep the job rerunnable; submitted task ids are only ever re-queried.
 const rerunnable=error=>stop(Object.keys(data.tasks||{}).length?'PAUSED_NETWORK':'WAITING_APPROVAL',providerMessage(error),error.code||error.message);
 async function downloadAsset(value,maxBytes){
  if(mock)return tripo.download(value,maxBytes);
  let url;try{url=new URL(value);}catch{throw new Error('UNAPPROVED_ASSET_HOST');}
  const approvedHost=tripoAssetHosts.has(url.hostname)||url.hostname.endsWith('.tripo3d.ai');
  if(url.protocol!=='https:'||url.port||url.username||url.password||!approvedHost)throw new Error('UNAPPROVED_ASSET_HOST');
  const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(180000)});
  if(!response.ok)throw new Error('ASSET_DOWNLOAD_FAILED');
  if(Number(response.headers.get('content-length'))>maxBytes)throw new Error('ASSET_TOO_LARGE');
  const chunks=[];let size=0;for await(const chunk of response.body){size+=chunk.length;if(size>maxBytes)throw new Error('ASSET_TOO_LARGE');chunks.push(chunk);}return Buffer.concat(chunks);
 }
 // Output URLs can expire; on a transient download failure drop the cached output so resume re-queries (free) instead of resubmitting.
 async function fetchOutput(record,value,maxBytes){
  if(typeof value!=='string'||!value)throw new Error('ASSET_MISSING');
  try{return await downloadAsset(value,maxBytes);}
  catch(error){if(unavailableAsset.has(error?.message))throw error;delete record.output;throw stop('PAUSED_NETWORK','模型下载中断，任务编号已保存；恢复时只重新查询下载地址，不重复提交。','ASSET_DOWNLOAD_PAUSED');}
 }
 async function task(key,endpoint,body){
  currentStep=key;data.tasks??={};
  try{await ensureTaskFunding(tripo,data.tasks,key,reservation,plan.spendLimit,plan.charges[key]);}
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
   if(result.status==='success'){record.output=result.output||{};record.credits=result.credits_consumed??(key==='rig_check'?0:null);save('RUNNING',`${key} 已完成。`);try{remainingGenerationBudget(data.tasks,reservation,plan.spendLimit);}catch{throw stop('FAILED','计费信息缺失或超出预期，已停止后续收费步骤，请核对账单。','BILLING_REVIEW_REQUIRED');}return record;}
   if(['failed','cancelled','banned','expired'].includes(result.status))throw stop('FAILED',`Tripo ${key} 未成功（${result.status}），请站长检查。`,'PROVIDER_FAILED');
   await new Promise(resolve=>setTimeout(resolve,pollMs));
  }
  throw stop('PAUSED_NETWORK','等待超时，任务编号已保存，请稍后恢复查询。','POLL_TIMEOUT');
 }
 const result=()=>db.prepare('SELECT status,step,message FROM jobs WHERE id=?').get(jobId);
 async function writeModel(file,bytes){
  const temporary=path.join(dir,`${file}.tmp`);
  await writeFile(temporary,bytes);
  await rename(temporary,path.join(dir,file));
 }
 async function readModelOutput(record,walking=false){
  let bytes;
  try{bytes=await fetchOutput(record,record.output.model_url,maxModelBytes);}
  catch(error){
   if(!unavailableAsset.has(error?.message)||error.message==='UNAPPROVED_ASSET_HOST')throw error;
   return {report:{renderable:false,issues:['asset_unavailable']}};
  }
  return {bytes,report:await assessModel(bytes,{walking,checkGround:!mock&&!walking})};
 }
 async function finishReview(reason,issues=[],selectedBytes){
  currentStep='local_quality_check';
  data.modelReview={result:reason,issues};
  const report=data.report||data.baseReport;
  if(data.modelFile&&report?.bytes<=MAX_PREVIEW_SOURCE_BYTES){
   save('PROCESSING','正在准备网页模型预览。');
   try{
    const preview=await buildModelPreview(selectedBytes??await readFile(path.join(dir,data.modelFile)));
    if(preview&&(await assessModel(preview,{walking:reason==='animated'})).renderable){
     await writeModel('model-preview.glb',preview);
     data.previewFile='model-preview.glb';
     report.previewBytes=preview.length;
    }
   }catch{ /* The original already passed inspection and remains available. */ }
  }
  const message=mock&&reason==='animated'?'示范流程已走完：模型是内置示例模型（lanlao-base.glb），并非根据你的照片生成，仅用于演示加工流程。':reviewMessages[reason];
  save('REVIEW_REQUIRED',message);
  return result();
 }
 try{
  // Claim the task before any provider request. A cancelled/deleted task must
  // never continue from the stale snapshot read before the worker acquired its lock.
  currentStep='upload';save('PROCESSING','正在核对授权和预算，尚未提交付费生成。');
  // Before anything is submitted, confirm the API balance first so a low balance reserves no test budget and leaves the job rerunnable.
  if(!Object.keys(data.tasks||{}).length){const account=await tripo.request('/account/balance');if(typeof account.balance!=='number'||!Number.isFinite(account.balance)||account.balance<plan.reservation)throw Object.assign(new Error('API_BALANCE_BELOW_RESERVATION'),{code:'API_BALANCE_BELOW_RESERVATION',reservation:plan.reservation});}
  if(!mock)reservation=reserveBudget(db,jobId,plan.reservation,Number(env.TEST_BUDGET_CREDITS||0));
  data.approvedAt??=Date.now();data.tokens??={};save('PROCESSING',mock?'正在模拟上传照片（照片不会离开本机）。':'正在将授权照片上传到 Tripo。');
  const photoViews=data.photoReview?.usedViews??Object.keys(data.photos);
  for(const view of photoViews){
   if(data.tokens[view])continue;
   const file=data.photos[view];
   data.tokens[view]=await tripo.upload(await readFile(path.join(dir,file)),/\.jpe?g$/i.test(file)?'image/jpeg':'image/png');
   save('PROCESSING',`${view} 照片已上传。`);
  }
  const tokens=Object.fromEntries(photoViews.map(view=>[view,data.tokens[view]]));
  const selectedViews=data.approvedSyntheticViews;
  let viewsTask;
  if(data.mode==='generated_views'&&!Array.isArray(selectedViews)){
   viewsTask=await task('multiview','/generation/image-to-multiview',{input:data.tokens.front});
   if(!data.viewsApprovedAt){
    currentStep='view_review';data.generatedViews={};save('PROCESSING','正在保存 AI 四视角，稍后需要你核对毛色与花纹。');
    const viewOutput=viewsTask.output.generate_multiview_image||viewsTask.output;
    for(const view of PHOTO_VIEWS){
     const url=viewOutput[`${view}_view_url`];
     if(!url)continue;
     const bytes=await fetchOutput(viewsTask,url,20*1024*1024),file=`generated-${view}.png`;
     await sharp(bytes,{limitInputPixels:24000000}).rotate().resize(2048,2048,{fit:'inside',withoutEnlargement:true}).png().toFile(path.join(dir,file));
     data.generatedViews[view]=file;
    }
    save('VIEW_REVIEW',mock?'示范四视角（由正面照翻转/调色得到，并非 AI 生成）已保存。确认后才继续示范流程。':'请核对生成的参考图，勾选能保留毛色和体型的侧面或背面。');
    return result();
   }
  }
  if(data.mode==='generated_views'&&Array.isArray(selectedViews)){
   data.generatedTokens??={};
   for(const view of selectedViews){
    if(!data.generatedTokens[view]){
     data.generatedTokens[view]=await tripo.upload(await readFile(path.join(dir,data.generatedViews[view])));
     save('PROCESSING',`已上传确认的 ${view} 参考图。`);
    }
    tokens[view]=data.generatedTokens[view];
   }
  }
  data.generationModel??=plan.profile==='detail'?DEFAULT_TRIPO_MODEL:env.TRIPO_MODEL||DEFAULT_TRIPO_MODEL;
  const request=generationRequest(tokens,data.generationModel,viewsTask?.id,plan.profile);
  const generated=await task('generation',request.endpoint,request.body);
  // Keep the validated colored geometry independently of the rig and walk outputs.
  let baseBytes;
  if(!data.baseModelFile){
   const base=await readModelOutput(generated);
   baseBytes=base.bytes;
   data.baseReport=base.report;
   if(base.report.renderable){
    await writeModel('base-model.glb',baseBytes);
    data.baseModelFile='base-model.glb';
   }
  }else if(data.baseReport?.renderable===undefined||!mock&&data.baseReport?.extraGroundContacts===undefined){
   baseBytes=await readFile(path.join(dir,data.baseModelFile));
   data.baseReport=await assessModel(baseBytes,{checkGround:!mock});
  }
  delete data.report;
  delete data.previewFile;
  if(!data.baseReport.renderable){
   delete data.modelFile;
   return await finishReview('invalid_base',data.baseReport.issues);
  }
  data.modelFile=data.baseModelFile;
  if(!data.baseReport.coat)return await finishReview('no_coat',data.baseReport.issues,baseBytes);
  if(data.baseReport.extraGroundContacts>4)return await finishReview('anatomy_review',data.baseReport.issues,baseBytes);
  baseBytes=undefined;
  save('RUNNING','彩色基础模型已保存，接下来检查四足绑定。');

  let rigged, walked;
  try{
   const checked=await task('rig_check','/animations/rig-check',{input:generated.id});
   if(checked.output.riggable!==true||checked.output.rig_type!=='quadruped'){
    return await finishReview('rig_unavailable',data.baseReport.issues);
   }
   rigged=await task('rig','/animations/rig',{input:generated.id,model:'v2.5-20260210',rig_type:'quadruped',spec:'tripo',out_format:'glb'});
   if(mock||data.tasks.walk){
    walked=await task('walk','/animations/retarget',{input:rigged.id,animation:'preset:quadruped:walk',out_format:'glb',bake_animation:true,export_with_geometry:true,animate_in_place:true});
   }
  }catch(error){
   if(error.code!=='PROVIDER_FAILED')throw error;
   return await finishReview('rig_failed',data.baseReport.issues);
  }
  currentStep='download';save('PROCESSING',mock?'正在检查带行走动作的模型。':'正在适配并检查蓝老的动作。');
  let bytes,report;
  if(mock){
   ({bytes,report}=await readModelOutput(walked,true));
   if(!report.renderable||!report.coat||!report.walkable)return await finishReview('invalid_walk',report.issues);
  }else{
   const rig=await readModelOutput(rigged);
   if(!rig.report.renderable||!rig.report.coat)return await finishReview('motion_review',rig.report.issues);
   try{bytes=await bakeLanlaoMotion(rig.bytes);}
   catch(error){console.error('Lanlao motion transfer failed',jobId,error.message);return await finishReview('motion_review',['unsupported_motion_rig']);}
   report=await assessModel(bytes,{walking:true});
   if(!report.renderable||!report.coat||!report.walkable)return await finishReview('motion_review',report.issues);
   report.motionTemplate='lanlao';
  }
  await writeModel('model.glb',bytes);
  data.modelFile='model.glb';data.report=report;
  if(env.BLENDER_PATH&&!options.skipBlender){
   try{await promisify(execFile)(env.BLENDER_PATH,['--background','--factory-startup','--python',path.join(root,'worker','inspect_model.py'),'--',path.join(dir,'model.glb'),path.join(dir,'quality.json')],{timeout:180000,maxBuffer:2*1024*1024,windowsHide:true});data.report.blender=JSON.parse(await readFile(path.join(dir,'quality.json'),'utf8'));}
   catch{data.report.blender={error:'本机 Blender 检查未完成，请人工检查。'};}
  }
  return await finishReview('animated',report.issues,bytes);
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
 }
 }finally{if(lock){
  try{
   const owned=await lock.stat();
   try{const current=await stat(lockPath);if(current.dev===owned.dev&&current.ino===owned.ino)await unlink(lockPath);}
   catch(error){if(error.code!=='ENOENT')throw error;}
  }finally{await lock.close();}
 }}
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
