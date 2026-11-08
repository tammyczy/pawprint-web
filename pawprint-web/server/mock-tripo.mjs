import {mkdir,readFile,writeFile,access} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import sharp from 'sharp';
import {TripoError} from './tripo.mjs';

// Offline stand-in for the Tripo client: same interface, no network, no charges. Outputs reuse a local sample GLB, so a mock model is never the user's pet.
export const MOCK_FAILURES=['balance','auth','submit','network','generation','rig_check','billing'];
export const MOCK_SAMPLE_GLB=fileURLToPath(new URL('../public/models/lanlao-base.glb',import.meta.url));
const kinds={'/generation/image-to-multiview':'multiview','/generation/image-to-model':'generation','/generation/multiview-to-model':'generation','/animations/rig-check':'rig_check','/animations/rig':'rig','/animations/retarget':'walk'};
const views=['front','left','back','right'];
const label=text=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="96"><rect width="1024" height="96" fill="#000" fill-opacity=".55"/><text x="512" y="62" font-family="sans-serif" font-size="40" font-weight="700" fill="#fff" text-anchor="middle">${text}</text></svg>`);
export class MockTripo {
 constructor({outDir,sampleGLB=MOCK_SAMPLE_GLB,fail=''}={}){
  if(!outDir)throw new Error('MockTripo 需要 outDir。');
  if(fail&&!MOCK_FAILURES.includes(fail))throw new Error(`TRIPO_MOCK_FAIL 只能是 ${MOCK_FAILURES.join('|')}。`);
  Object.assign(this,{mock:true,outDir:path.resolve(outDir),sample:path.resolve(sampleGLB),fail,polls:new Map(),networkFailed:false});
 }
 #auth(){if(this.fail==='auth')throw new TripoError('TRIPO_AUTH',{status:401,definite:true,providerMessage:'mock: invalid api key'});}
 async request(endpoint){this.#auth();if(endpoint==='/account/balance')return {balance:this.fail==='balance'?0:100000,frozen:0,mock:true};throw new TripoError('TRIPO_API',{status:404,definite:true,providerMessage:'mock: unknown endpoint'});}
 async upload(bytes,mime='image/png'){this.#auth();await mkdir(this.outDir,{recursive:true});const token=`mock_file_${randomUUID()}`;await writeFile(path.join(this.outDir,`${token}.${mime==='image/jpeg'?'jpg':'png'}`),bytes);return token;}
 async submit(endpoint,body){
  this.#auth();const kind=kinds[endpoint];if(!kind)throw new TripoError('TRIPO_API',{status:404,definite:true,providerMessage:'mock: unknown endpoint'});
  if(this.fail==='submit')throw new TripoError('TRIPO_NETWORK');
  const id=`mock-${kind}-${randomUUID()}`;if(kind==='multiview')await this.#views(id,body.input);return id;
 }
 // Four clearly labelled stand-in views made from the uploaded front photo (mirror, rotate, mirror+grey), not real AI views.
 async #views(id,token){
  if(!/^mock_file_[0-9a-f-]{36}$/.test(token||''))throw new TripoError('TRIPO_API',{status:400,definite:true,providerMessage:'mock: unknown file token'});
  let source;for(const ext of ['png','jpg'])try{const file=path.join(this.outDir,`${token}.${ext}`);await access(file);source=file;break;}catch{}
  if(!source)throw new TripoError('TRIPO_API',{status:400,definite:true,providerMessage:'mock: unknown file token'});
  const base=await sharp(source).rotate().resize(1024,1024,{fit:'contain',background:'#ffffff'}).flatten({background:'#ffffff'}).png().toBuffer();
  const variants={front:sharp(base),left:sharp(base).flop(),back:sharp(base).flip().modulate({brightness:.8}),right:sharp(base).flop().grayscale()};
  for(const view of views)await variants[view].composite([{input:label(`DEMO MOCK · ${view.toUpperCase()} (not AI)`),gravity:'south'}]).png().toFile(path.join(this.outDir,`${id}-${view}.png`));
 }
 #output(kind,id){
  const url=file=>pathToFileURL(file).href;
  if(kind==='multiview')return Object.fromEntries(views.map(view=>[`${view}_view_url`,url(path.join(this.outDir,`${id}-${view}.png`))]));
  if(kind==='rig_check')return this.fail==='rig_check'?{riggable:false,rig_type:'others'}:{riggable:true,rig_type:'quadruped'};
  return {model_url:url(this.sample)};
 }
 async query(id){
  this.#auth();const match=/^mock-(multiview|generation|rig_check|rig|walk)-[0-9a-f-]{36}$/.exec(id||'');
  if(!match)throw new TripoError('TRIPO_API',{status:404,definite:true,providerMessage:'mock: unknown task'});
  const kind=match[1];
  if(this.fail==='network'&&kind==='generation'&&!this.networkFailed){this.networkFailed=true;throw new TripoError('TRIPO_NETWORK');}
  const poll=(this.polls.get(id)||0)+1;this.polls.set(id,poll);
  if(poll===1)return {task_id:id,status:'queued',progress:0};
  if(poll===2)return {task_id:id,status:'running',progress:50};
  if(this.fail==='generation'&&kind==='generation')return {task_id:id,status:'failed',progress:100};
  return {task_id:id,status:'success',progress:100,credits_consumed:this.fail==='billing'&&kind==='generation'?80:0,output:this.#output(kind,id)};
 }
 // Mock "downloads" read only the sample GLB or files this mock wrote; the real https allowlist is untouched.
 async download(value,maxBytes){
  let file;try{const url=new URL(value);if(url.protocol!=='file:')throw 0;file=path.resolve(fileURLToPath(url));}catch{throw new Error('UNAPPROVED_ASSET_HOST');}
  if(file!==this.sample&&path.dirname(file)!==this.outDir)throw new Error('UNAPPROVED_ASSET_HOST');
  const bytes=await readFile(file);if(bytes.length>maxBytes)throw new Error('ASSET_TOO_LARGE');return bytes;
 }
}
