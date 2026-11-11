import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import {randomBytes,randomUUID,scrypt as scryptCb,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
import {mkdir,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {openStore,updateJob} from './store.mjs';
import {SPEECH_VOICES,SPEECH_TONES} from './companion-speech.mjs';
import {validateMemoryDraft} from './memory-draft.mjs';
import {createMemoryRateLimit} from './memory-rate-limit.mjs';
import {privacyReply} from './privacy-reply.mjs';
import {guardCompanionAction} from './action-guard.mjs';

const scrypt=promisify(scryptCb), hash=t=>createHash('sha256').update(t).digest('hex');
const err=(message,status=400)=>Object.assign(new Error(message),{status});
const mediaFormats={
 video:{'video/mp4':'mp4','video/webm':'webm','video/quicktime':'mov'},
 audio:{'audio/mpeg':'mp3','audio/wav':'wav','audio/x-wav':'wav','audio/wave':'wav','audio/ogg':'ogg','audio/webm':'webm','audio/mp4':'m4a','audio/x-m4a':'m4a'}
};
function validMedia(bytes,extension){
 const ascii=(start,end)=>bytes.toString('ascii',start,end);
 if(['mp4','mov','m4a'].includes(extension))return bytes.length>12&&ascii(4,8)==='ftyp';
 if(extension==='webm')return bytes.length>4&&bytes.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3]));
 if(extension==='wav')return bytes.length>12&&ascii(0,4)==='RIFF'&&ascii(8,12)==='WAVE';
 if(extension==='ogg')return bytes.length>4&&ascii(0,4)==='OggS';
 if(extension==='mp3')return bytes.length>3&&(ascii(0,3)==='ID3'||bytes[0]===0xff&&(bytes[1]&0xe0)===0xe0);
 return false;
}
export async function makeApp({dataDir,distDir,origin,allowedOrigins=[origin],allowRegistration=true,keyConfigured=false,localMode=false,companionAI=null,companionSpeech=null,memoryDraft=null,cloud=false,registrationCode="",automaticGeneration=false}){
 if(localMode&&!['127.0.0.1','localhost','[::1]'].includes(new URL(origin).hostname))throw new Error('免登录模式只能使用本机地址，不能配置公网入口。');
 const db=openStore(dataDir),app=express(),secure=new URL(origin).protocol==='https:';
 const localUser={id:'local-workspace',email:'本机工作区',local:true};
 if(localMode)db.prepare('INSERT OR IGNORE INTO users(id,email,password,created) VALUES(?,?,?,?)').run(localUser.id,'local-workspace@lanlao.invalid','disabled',Date.now());
 app.disable('x-powered-by');
 app.use((req,res,next)=>{
  if(localMode&&(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)||!['127.0.0.1','localhost','[::1]'].includes(req.hostname)||req.headers.forwarded||req.headers['x-forwarded-for']||req.headers['x-forwarded-host']||req.headers['cf-connecting-ip']))return res.status(403).json({error:'免登录测试模式仅限本机直接访问，禁止公网代理。'});
  next();
 });
 app.use((req,res,next)=>{res.set({'X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','X-Frame-Options':'DENY','Permissions-Policy':'camera=(), microphone=(self)'});next();});
 app.use('/api',(req,res,next)=>{
  res.set('Cache-Control','no-store');
  if(!['GET','HEAD','OPTIONS'].includes(req.method)&&!allowedOrigins.includes(req.headers.origin))return res.status(403).json({error:'请求来源不匹配，请从本站打开页面。'});
  next();
 });
 app.use(express.json({limit:'8kb'}));
 const attempts=new Map();
 function authLimit(req,res,next){const k=req.ip,now=Date.now();let a=attempts.get(k);if(!a||now>a.until){a={count:0,until:now+600000};attempts.set(k,a);}if(++a.count>15)return res.status(429).json({error:'登录尝试过多，请十分钟后重试。'});next();}
 app.use('/api',(req,res,next)=>{
  if(localMode){req.user=localUser;return next();}
  const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('lanlao_session='))?.split('=')[1];
  if(token&&/^[a-f0-9]{64}$/.test(token))req.user=db.prepare('SELECT users.id,users.email FROM sessions JOIN users ON users.id=sessions.user_id WHERE token=? AND expires>?').get(hash(token),Date.now());
  req.sessionHash=token?hash(token):null;next();
 });
 // Use authenticated identities for request limits behind a shared proxy.
 const limits=new Map();
 app.use('/api',(req,res,next)=>{
  const key=req.user?.id||req.ip,now=Date.now();
  let item=limits.get(key);if(!item||now>item.until){item={count:0,until:now+60000};limits.set(key,item);}
  if(limits.size>10000)for(const [k,v]of limits)if(v.until<now)limits.delete(k);
  if(++item.count>180)return res.status(429).json({error:'请求太频繁，请稍后重试。'});next();
 });
 const requireUser=(req,res,next)=>req.user?next():res.status(401).json({error:'请先登录。'});
 function session(res,id){const token=randomBytes(32).toString('hex');db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hash(token),id,Date.now()+7*86400000);res.cookie('lanlao_session',token,{httpOnly:true,sameSite:'strict',secure,path:'/',maxAge:7*86400000});}
 app.get('/api/health',(req,res)=>res.json({ok:true,generationConfigured:keyConfigured,automaticGeneration,inviteRequired:!!registrationCode,reviewRequired:true,registration:!localMode&&allowRegistration,localMode,conversation:companionAI?'openai':'local-rules',memoryDraft:memoryDraft?'openai':null,speech:companionSpeech?'openai':null,speechVoices:companionSpeech?SPEECH_VOICES:[],deployment:cloud?'cloud':'local-pilot'}));
 app.get('/api/me',(req,res)=>res.json({user:req.user||null}));
 app.post('/api/register',authLimit,async(req,res)=>{
  if(localMode||!allowRegistration)throw err('目前无需注册；请直接使用本机工作区。',403);
  if(registrationCode&&(typeof req.body.inviteCode!=='string'||!timingSafeEqual(Buffer.from(hash(req.body.inviteCode),'hex'),Buffer.from(hash(registrationCode),'hex'))))throw err('请输入有效的邀请码。',403);
  const email=String(req.body.email||'').trim().toLowerCase(),password=String(req.body.password||'');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>200||password.length<12||password.length>128)throw err('请输入有效邮箱，以及 12–128 位密码。');
  if(db.prepare('SELECT id FROM users WHERE email=?').get(email))throw err('无法创建账号，请检查邮箱或直接登录。');
  const salt=randomBytes(16).toString('hex'),key=await scrypt(password,salt,64),id=randomUUID();
  try{db.prepare('INSERT INTO users VALUES(?,?,?,?)').run(id,email,`${salt}:${key.toString('hex')}`,Date.now());}catch{throw err('无法创建账号，请直接登录。');}
  session(res,id);res.status(201).json({user:{id,email}});
 });
 app.post('/api/login',authLimit,async(req,res)=>{
  if(localMode)throw err('本机测试模式无需登录。',403);
  const email=String(req.body.email||'').trim().toLowerCase(),password=String(req.body.password||'');
  if(password.length>128)throw err('邮箱或密码不正确。',401);
  const user=db.prepare('SELECT * FROM users WHERE email=?').get(email);
  const [salt,key]=(user?.password||`${'0'.repeat(32)}:${'0'.repeat(128)}`).split(':');
  const candidate=await scrypt(password,salt,64);
  if(!user||!timingSafeEqual(candidate,Buffer.from(key,'hex')))throw err('邮箱或密码不正确。',401);
  session(res,user.id);res.json({user:{id:user.id,email:user.email}});
 });
 app.post('/api/logout',(req,res)=>{if(req.sessionHash)db.prepare('DELETE FROM sessions WHERE token=?').run(req.sessionHash);res.clearCookie('lanlao_session',{path:'/'});res.json({ok:true});});
 function own(req){const job=db.prepare("SELECT * FROM jobs WHERE id=? AND user_id=? AND status!='DELETED'").get(req.params.id,req.user.id);if(!job)throw err('找不到这个任务。',404);return job;}
 const chatLimits=new Map();
 app.post('/api/companion/chat',requireUser,async(req,res)=>{
  const now=Date.now(),prior=chatLimits.get(req.user.id)||[];
  const recent=prior.filter(at=>now-at<60000);
  if(recent.length>=20)throw err('对话太频繁，请稍后再试。',429);
  recent.push(now);chatLimits.set(req.user.id,recent);
  const body=req.body||{},text=typeof body.text==='string'?body.text.trim():'';
  if(!text||text.length>400)throw err('请发送 1–400 字的内容。');
  if(!Array.isArray(body.history)||body.history.length>10)throw err('对话记录格式不正确。');
  const history=body.history.map(item=>({role:item?.role,content:item?.content}));
  if(history.some(item=>!['user','assistant'].includes(item.role)||typeof item.content!=='string'||item.content.length>500))throw err('对话记录格式不正确。');
  let name='Lanlao',kind='dog';
  if(body.petId!==null&&body.petId!==undefined){
   if(typeof body.petId!=='string'||!/^[a-f0-9-]{36}$/.test(body.petId))throw err('宠物编号不正确。');
   const job=db.prepare("SELECT name,data FROM jobs WHERE id=? AND user_id=? AND status!='DELETED'").get(body.petId,req.user.id);
   if(!job)throw err('找不到这个宠物。',404);
   name=job.name;kind=JSON.parse(job.data).species||(body.petId==='64989a83-4ed5-4708-9062-b67aa2892ecd'?'cat':'dog');
  }
  const privacy=privacyReply(text);
  if(privacy)return res.json(privacy);
  if(!companionAI)throw err('OpenAI API Key 尚未配置；请在本地 .env 填写并重启服务。',503);
  const controller=new AbortController();
  const closed=()=>{if(!res.writableEnded)controller.abort();};res.once('close',closed);
  try{const answer=await companionAI({name,kind,text,history,signal:controller.signal});if(!controller.signal.aborted)res.json(guardCompanionAction({text,name,answer}));}
  catch(error){if(!controller.signal.aborted)throw error;}
  finally{res.off('close',closed);}
 });
 const memoryLimits=createMemoryRateLimit();
 app.post('/api/memory/draft',requireUser,async(req,res)=>{
  const {memory,language,consent}=req.body||{};
  if(typeof memory!=='string'||!memory.trim()||memory.length>1200||!['zh','en','fr'].includes(language)||consent!==true)throw err('Provide your memory, language, and consent before requesting a draft.');
  if(!memoryDraft)throw err('AI drafting is not configured.',503);
  if(!memoryLimits.take(req.user.id))throw err('Too many draft requests. Please try again later.',429);
  const controller=new AbortController();
  const closed=()=>{if(!res.writableEnded)controller.abort();};res.once('close',closed);
  try{const draft=await memoryDraft({memory,language,signal:controller.signal});if(!controller.signal.aborted)res.json(validateMemoryDraft(draft,memory));}
  catch(error){if(!controller.signal.aborted)throw error;}
  finally{res.off('close',closed);}
 });
 const speechLimits=new Map();
 app.post('/api/companion/speech',requireUser,async(req,res)=>{
  if(!companionSpeech)throw err('Voice is not configured yet.',503);
  const {text,voice='verse',tone='natural'}=req.body||{};
  if(typeof text!=='string'||!text.trim()||text.length>500||!SPEECH_VOICES.includes(voice)||!SPEECH_TONES.includes(tone))throw err('Choose an available voice and tone, and provide 1–500 characters.');
  const now=Date.now(),recent=(speechLimits.get(req.user.id)||[]).filter(at=>now-at<60000);
  if(recent.length>=20)throw err('Too many voice requests. Please try again shortly.',429);
  recent.push(now);speechLimits.set(req.user.id,recent);
  const controller=new AbortController();
  const closed=()=>{if(!res.writableEnded)controller.abort();};res.once('close',closed);
  try{const bytes=await companionSpeech({text:text.trim(),voice,tone,signal:controller.signal});if(!controller.signal.aborted)res.type('audio/mpeg').send(bytes);}
  catch(error){if(!controller.signal.aborted)throw error;}
  finally{res.off('close',closed);}
 });
 function publicJob(j){const data=JSON.parse(j.data);return {id:j.id,name:j.name,species:data.species||(j.id==='64989a83-4ed5-4708-9062-b67aa2892ecd'?'cat':'dog'),status:j.status,step:j.step,message:j.message,created:j.created,updated:j.updated,views:Object.keys(data.photos||{}),references:Object.keys(data.references||{}),generatedViews:Object.keys(data.generatedViews||{}),mode:data.mode||'direct',hasModel:!!data.modelFile,report:data.report||null,mock:!!data.mock};}
 app.get('/api/jobs',requireUser,(req,res)=>res.json({jobs:db.prepare("SELECT * FROM jobs WHERE user_id=? AND status!='DELETED' ORDER BY created DESC").all(req.user.id).map(publicJob)}));
 app.get('/api/jobs/:id',requireUser,(req,res)=>{const job=own(req);res.json({...publicJob(job),events:db.prepare('SELECT at,status,message FROM events WHERE job_id=? ORDER BY id').all(job.id)});});
 const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:10*1024*1024,files:4,fields:4,parts:8},fileFilter:(req,file,cb)=>cb(null,['image/jpeg','image/png','image/webp'].includes(file.mimetype))}).fields(['front','left','back','right'].map(name=>({name,maxCount:1})));
 // Serialize decoding to keep memory bounded even with simultaneous submissions.
 let uploading=false;
 app.post('/api/jobs',requireUser,(req,res,next)=>{
  if(uploading)return res.status(429).json({error:'正在处理其他照片，请稍后重试。'});
  if(db.prepare("SELECT count(*) AS n FROM jobs WHERE user_id=? AND status!='DELETED'").get(req.user.id).n>=10)return res.status(429).json({error:'当前工作区最多保留 10 个任务，请先删除不需要的任务。'});
  uploading=true;let done=false;const release=()=>{if(!done){done=true;uploading=false;}};res.once('finish',release);res.once('close',release);upload(req,res,next);
 },async(req,res)=>{
  const name=String(req.body.name||'').trim();if(!name||name.length>30)throw err('宠物名字需要 1–30 个字。');
  const species=req.body.species||'dog';if(!['dog','cat'].includes(species))throw err('目前支持小狗或小猫。');
  if(req.body.consent!=='yes')throw err('请确认照片授权和第三方处理说明。');
  if(!req.files?.front?.[0])throw err('请上传正面照片（JPEG、PNG 或 WebP）。');
  const mode=req.body.mode||'direct';if(!['direct','generated_views'].includes(mode))throw err('无效的生成路线。');
  if(mode==='generated_views'&&Object.keys(req.files).length!==1)throw err('AI 补视角路线只需要一张正面照；已有多角度照片时请选择直接生成。');
  const converted={};
  for(const [view,files]of Object.entries(req.files)){
   const input=files[0].buffer;
   try{const img=sharp(input,{limitInputPixels:24000000,failOn:'warning'}),meta=await img.metadata();
    if(!['jpeg','png','webp'].includes(meta.format)||meta.pages>1||meta.width<256||meta.height<256)throw new Error();
    converted[view]=await img.rotate().resize(2048,2048,{fit:'inside',withoutEnlargement:true}).png().toBuffer();
   }catch{throw err('照片必须是有效的静态图片，至少 256×256、最多 2400 万像素。');}
  }
  const id=randomUUID(),dir=path.join(dataDir,'assets',id);await mkdir(dir,{recursive:true});
  try{
   const photos={};for(const [view,bytes]of Object.entries(converted)){await writeFile(path.join(dir,`${view}.png`),bytes);photos[view]=`${view}.png`;}
   const now=Date.now(),message='照片已私密保存，等待站长配置并授权本次生成。尚未产生 API 费用。';
   db.prepare('INSERT INTO jobs(id,user_id,name,status,data,message,created,updated) VALUES(?,?,?,?,?,?,?,?)').run(id,req.user.id,name,'WAITING_APPROVAL',JSON.stringify({photos,mode,species,consentAt:now}),message,now,now);
   db.prepare('INSERT INTO events(job_id,at,status,message) VALUES(?,?,?,?)').run(id,now,'WAITING_APPROVAL',message);
  }catch(e){await rm(dir,{recursive:true,force:true});throw e;}
  res.status(201).json(publicJob(db.prepare('SELECT * FROM jobs WHERE id=?').get(id)));
 });
 const referenceUpload=multer({storage:multer.memoryStorage(),limits:{fileSize:25*1024*1024,files:1,fields:0,parts:1}}).single('file');
 app.post('/api/jobs/:id/reference/:kind',requireUser,(req,res,next)=>{
  const job=own(req),kind=req.params.kind;
  if(!mediaFormats[kind])throw err('Only video and audio references are supported.');
  if(!['WAITING_APPROVAL','VIEW_REVIEW'].includes(job.status))throw err('Add references before model processing begins.',409);
  if(JSON.parse(job.data).references?.[kind])throw err('This reference has already been uploaded.',409);
  referenceUpload(req,res,next);
 },async(req,res)=>{
  const job=own(req),kind=req.params.kind,file=req.file;
  if(!file)throw err('Choose a media file to upload.');
  const extension=mediaFormats[kind]?.[file.mimetype];
  if(!extension||!validMedia(file.buffer,extension))throw err('Unsupported or invalid media file.');
  if(kind==='audio'&&file.size>8*1024*1024)throw err('Audio must be 8 MB or less.');
  const data=JSON.parse(job.data);
  if(!['WAITING_APPROVAL','VIEW_REVIEW'].includes(job.status)||data.references?.[kind])throw err('This reference can no longer be added.',409);
  const savedName=`reference-${kind}.${extension}`;
  await writeFile(path.join(dataDir,'assets',job.id,savedName),file.buffer,{flag:'wx'});
  data.references={...data.references,[kind]:{file:savedName,mime:file.mimetype,size:file.size}};
  if(!updateJob(db,job.id,{data},{expectedStatus:job.status})){await rm(path.join(dataDir,'assets',job.id,savedName),{force:true});throw err('This task is no longer available.',409);}
  res.status(201).json({kind,size:file.size});
 });
 app.get('/api/jobs/:id/reference/:kind',requireUser,(req,res)=>{
  const job=own(req),reference=JSON.parse(job.data).references?.[req.params.kind];
  if(!reference)throw err('Reference not found.',404);
  res.type(reference.mime).sendFile(path.join(dataDir,'assets',job.id,reference.file),{dotfiles:'allow'});
 });
 app.get('/api/jobs/:id/photo/:view',requireUser,(req,res)=>{const j=own(req),photos=JSON.parse(j.data).photos;if(!photos[req.params.view])throw err('照片不存在。',404);res.sendFile(path.join(dataDir,'assets',j.id,photos[req.params.view]),{dotfiles:'allow'});});
 app.get('/api/jobs/:id/generated-view/:view',requireUser,(req,res)=>{const j=own(req),views=JSON.parse(j.data).generatedViews||{};if(!views[req.params.view])throw err('视角图不存在。',404);res.sendFile(path.join(dataDir,'assets',j.id,views[req.params.view]),{dotfiles:'allow'});});
 app.post('/api/jobs/:id/start',requireUser,(req,res)=>{
  if(!automaticGeneration)throw err('在线生成暂未启用。',503);
  const job=own(req);
  if(!['WAITING_APPROVAL','PAUSED_NETWORK'].includes(job.status))throw err('当前任务无法排队。',409);
  if(!updateJob(db,job.id,{status:'QUEUED',message:'生成已排队。'},{expectedStatus:job.status}))throw err('任务状态已改变，请刷新后重试。',409);
  res.status(202).json({ok:true});
 });
 app.post('/api/jobs/:id/approve-views',requireUser,(req,res)=>{const j=own(req);if(j.status!=='VIEW_REVIEW')throw err('此任务不在视角确认阶段。',409);const data=JSON.parse(j.data);data.viewsApprovedAt=Date.now();if(!updateJob(db,j.id,{status:automaticGeneration?'QUEUED':'WAITING_APPROVAL',data,message:automaticGeneration?'已确认四视角，3D 生成已排队。':'你已确认 AI 四视角。等待站长继续生成 3D；确认本身不会扣费。'},{expectedStatus:j.status}))throw err('任务状态已改变，请刷新后重试。',409);res.json({ok:true});});
 app.get('/api/jobs/:id/model',requireUser,(req,res)=>{const j=own(req),file=JSON.parse(j.data).modelFile;if(!file)throw err('模型尚未生成。',404);res.type('model/gltf-binary').sendFile(path.join(dataDir,'assets',j.id,file),{dotfiles:'allow'});});
 app.post('/api/jobs/:id/cancel',requireUser,(req,res)=>{const j=own(req);if(['SUBMITTING','RUNNING','PROCESSING'].includes(j.status))throw err('任务正在运行，无法撤回已提交给 Tripo 的请求。请等待完成后删除。',409);if(j.status!=='CANCELLED'&&!updateJob(db,j.id,{status:'CANCELLED',message:'任务已取消。'},{expectedStatus:j.status}))throw err('任务状态已改变，请刷新后重试。',409);res.json({ok:true});});
 app.delete('/api/jobs/:id',requireUser,async(req,res)=>{const j=own(req);if(['SUBMITTING','RUNNING','PROCESSING'].includes(j.status))throw err('任务正在处理，请完成后再删除。',409);if(!db.prepare("UPDATE jobs SET status='DELETED',data='{}',name='已删除',message='',updated=? WHERE id=? AND status=?").run(Date.now(),j.id,j.status).changes)throw err('任务状态已改变，请刷新后重试。',409);await rm(path.join(dataDir,'assets',j.id),{recursive:true,force:true});res.json({ok:true});});
 app.use('/api',(req,res)=>res.status(404).json({error:'接口不存在。'}));
 if(distDir)app.use(express.static(distDir,{dotfiles:'deny'}));
 app.use((error,req,res,next)=>{if(res.headersSent)return next(error);const known=error.status||error instanceof multer.MulterError;res.status(error.status|| (error instanceof multer.MulterError?400:500)).json({error:known?(error instanceof multer.MulterError?'上传超过限制：最多 4 张，每张不超过 10MB。':error.message):'服务暂时出错，请稍后重试。'});});
 return {app,db};
}
