import {readProviderBody} from './provider-response.mjs';
// Classified provider errors: .code for the worker, .definite when Tripo answered and rejected (safe to rerun), never the key or raw body.
export class TripoError extends Error{constructor(code,{status,apiCode,providerMessage,definite=false}={}){super(`${code}${status?` HTTP ${status}`:''}${apiCode!==undefined?` code ${apiCode}`:''}${providerMessage?`: ${providerMessage}`:''}`);this.name='TripoError';Object.assign(this,{code,status,apiCode,providerMessage,definite});}}
export function sanitizeProviderMessage(value,key){
 let text=typeof value==='string'?value:'';if(key&&key.length>=4)text=text.split(key).join('[key]');
 return text.replace(/Bearer\s+\S+/gi,'Bearer [key]').replace(/\btsk_[A-Za-z0-9_-]+/g,'[key]').replace(/[\u0000-\u001f\u007f<>]/g,' ').replace(/\s+/g,' ').trim().slice(0,160);
}
const balanceText=/insufficient|not enough|balance|credit/i;
export function classifyTripoFailure({status,apiCode,message}){
 if(status===401||status===403)return 'TRIPO_AUTH';
 if(balanceText.test(message||'')&&(!status||status<500))return 'TRIPO_BALANCE';
 if(status===429)return 'TRIPO_RATE_LIMIT';
 if(status>=500)return 'TRIPO_SERVER';
 return apiCode!==undefined||status?'TRIPO_API':'TRIPO_BAD_RESPONSE';
}
export class Tripo {
 constructor(key,fetcher=fetch){this.key=key;this.fetcher=fetcher;}
 async request(endpoint,{body,method='GET'}={}){
  const multipart=body instanceof FormData;let response,result;
  try{response=await this.fetcher(`https://openapi.tripo3d.ai/v3${endpoint}`,{method,headers:{Authorization:`Bearer ${this.key}`,...(body&&!multipart?{'Content-Type':'application/json'}:{})},body:body?(multipart?body:JSON.stringify(body)):undefined,signal:AbortSignal.timeout(90000),redirect:'error'});}
  catch(error){throw new TripoError(error?.name==='TimeoutError'?'TRIPO_TIMEOUT':'TRIPO_NETWORK');}
  try{result=JSON.parse(Buffer.from(await readProviderBody(response,{maxBytes:2*1024*1024})).toString('utf8'));}catch{result=null;}
  const apiCode=result&&result.code!==undefined&&result.code!==null?Number(result.code):undefined,providerMessage=sanitizeProviderMessage(result?.message??result?.error,this.key);
  // A 4xx or an explicit API error body means Tripo answered and refused; 5xx/garbled replies stay uncertain.
  if(!response.ok)throw new TripoError(classifyTripoFailure({status:response.status,apiCode,message:providerMessage}),{status:response.status,apiCode,providerMessage,definite:response.status<500&&response.status!==408});
  if(!result)throw new TripoError('TRIPO_BAD_RESPONSE',{status:response.status});
  if(result.code!==0||!result.data)throw new TripoError(classifyTripoFailure({apiCode,message:providerMessage}),{apiCode,providerMessage,definite:result.code!==0});
  return result.data;
 }
 async upload(bytes,mime='image/png'){const form=new FormData();form.set('file',new Blob([bytes],{type:mime}),mime==='image/jpeg'?'pet.jpg':'pet.png');const result=await this.request('/files',{method:'POST',body:form});if(!result.file_token)throw new TripoError('TRIPO_BAD_RESPONSE');return result.file_token;}
 async submit(endpoint,body){const data=await this.request(endpoint,{method:'POST',body});if(typeof data.task_id!=='string')throw new TripoError('TRIPO_BAD_RESPONSE');return data.task_id;}
 query(id){return this.request(`/tasks/${encodeURIComponent(id)}`);}
}
export function generationRequest(tokens,model,multiviewTaskId){
 const options={model,texture:true,pbr:true,face_limit:50000,texture_alignment:'original_image',texture_quality:'standard',geometry_quality:'standard',enable_image_autofix:false};
 if(multiviewTaskId)return {endpoint:'/generation/multiview-to-model',body:{...options,inputs:[{task_id:multiviewTaskId}]}};
 return Object.keys(tokens).length===1?{endpoint:'/generation/image-to-model',body:{...options,input:tokens.front}}:{endpoint:'/generation/multiview-to-model',body:{...options,inputs:Object.entries(tokens).map(([view,token])=>({[view]:token}))}};
}
export function inspectGLB(bytes){
 if(bytes.length<20||bytes.toString('ascii',0,4)!=='glTF'||bytes.readUInt32LE(4)!==2||bytes.readUInt32LE(8)!==bytes.length||bytes.readUInt32LE(16)!==0x4e4f534a)throw new Error('Invalid GLB');
 const length=bytes.readUInt32LE(12);if(length>bytes.length-20)throw new Error('Invalid GLB JSON');
 const document=JSON.parse(bytes.toString('utf8',20,20+length));
 for(const resource of [...document.buffers||[],...document.images||[]])if(resource.uri&&!resource.uri.startsWith('data:'))throw new Error('External GLB resources are not allowed');
 const animations=(document.animations||[]).map(x=>x.name||'Unnamed');
 return {animations,meshes:document.meshes?.length||0,materials:document.materials?.length||0,skins:document.skins?.length||0,joints:(document.skins||[]).reduce((n,s)=>n+s.joints.length,0)};
}
