// One request per frozen synthetic case; no retries, uploads, or production data.
// Results are written incrementally outside public/. The key is never logged.
import {createHash,randomUUID} from 'node:crypto';
import {readFile,mkdir,writeFile,appendFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {createCompanionAI} from '../../server/companion-ai.mjs';
import {guardCompanionAction} from '../../server/action-guard.mjs';
import {readProviderBody} from '../../server/provider-response.mjs';
import {parseCommand} from '../../src/commands.js';

const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../..');
const expectedHash='dadb473f7e2330a487c44a92b15a67ebc604e1fc4378d1bcf10ae553dfc0e80d';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const bytes=await readFile(path.join(here,'cases.json'));
if(sha(bytes)!==expectedHash)throw new Error('Frozen dataset hash mismatch; no calls were made.');
if(!process.env.OPENAI_API_KEY)throw new Error('OpenAI key missing; no calls were made.');
const data=JSON.parse(bytes),model=process.env.OPENAI_MODEL||'gpt-5.4-mini';
const runId=new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomUUID().slice(0,8);
const outputDir=path.join(here,'runs',runId);
await mkdir(path.join(here,'runs'),{recursive:true});
await mkdir(outputDir);
const hashes={};
for(const filename of ['server/companion-ai.mjs','server/action-guard.mjs','server/provider-response.mjs','src/commands.js','review/frozen-agent-cases-2026-11-09/run.mjs'])hashes[filename]=sha(await readFile(path.join(root,filename)));
const metadata={schemaVersion:1,runId,startedAt:new Date().toISOString(),datasetSha256:expectedHash,model,node:process.version,
 author:'AI-generated synthetic cases, not a human independent blind test',callsPlanned:data.items.length,maxAttemptsPerCase:1,
 surface:'direct model adapter, offline rule and server guard; not browser, HTTP, crisis-routing or animation execution',hashes};
await writeFile(path.join(outputDir,'metadata.json'),JSON.stringify(metadata,null,2)+'\n');
let captured=null,providerHttpStatus=null;
const captureFetch=async(url,options)=>{
 const response=await fetch(url,options);providerHttpStatus=response.status;
 if(response.ok){
  try{
   const raw=JSON.parse((await readProviderBody(response.clone(),{maxBytes:64*1024,signal:options.signal})).toString('utf8'));
   // Retain model-generated output and usage, not request headers or credentials.
   captured={status:raw.status??null,model:raw.model??null,usage:raw.usage??null,output:raw.output??null};
  }catch{captured={captureError:true};}
 }
 return response;
};
const respond=createCompanionAI({apiKey:process.env.OPENAI_API_KEY,model,fetchImpl:captureFetch,timeoutMs:20000});
const rows=[];
let consecutiveErrors=0,stopReason=null;
for(const item of data.items){
 captured=null;providerHttpStatus=null;
 const start=performance.now();let result,error=null;
 try{result=await respond({name:'Lanlao',kind:'dog',text:item.text,history:[]});}
 catch(e){error={status:Number.isInteger(e?.status)?e.status:null,kind:'provider_or_adapter_error'};}
 const durationMs=Math.round(performance.now()-start);
 const row={id:item.id,lang:item.lang,group:item.group,text:item.text,allowedActions:item.allowedActions,scoring:item.scoring,
  offlineAction:parseCommand(item.text)||'none',providerHttpStatus,provider:captured,adapter:error?null:result,
  guarded:error?null:guardCompanionAction({text:item.text,name:'Lanlao',answer:result}),durationMs,error};
 rows.push(row);await appendFile(path.join(outputDir,'rows.jsonl'),JSON.stringify(row)+'\n');
 consecutiveErrors=error?consecutiveErrors+1:0;
 if(rows.length%10===0)console.log(`${rows.length}/${data.items.length} attempted`);
 if([401,403,429].includes(providerHttpStatus)||consecutiveErrors>=3){stopReason=providerHttpStatus===429?'rate_limited':providerHttpStatus===401||providerHttpStatus===403?'authorization_error':'three_consecutive_errors';break;}
}
const buckets={};
function stats(rows,stage){
 const eligible=rows.filter(x=>x.scoring==='automatic');
 const success=eligible.filter(x=>stage==='offline'||!x.error);
 const action=x=>stage==='offline'?x.offlineAction:stage==='adapter'?x.adapter.action??'none':x.guarded.action??'none';
 const matches=success.filter(x=>x.allowedActions.includes(action(x))).length;
 const groups={none:0,stop:0,other:0};
 for(const x of success.filter(x=>x.group==='negation')){const a=action(x);groups[a==='none'?'none':a==='stop'?'stop':'other']++;}
 return {requests:rows.length,automaticCases:eligible.length,scored:success.length,errors:eligible.length-success.length,matches,
  matchRate:success.length?matches/success.length:null,negationResults:groups,
  ambiguousCases:rows.filter(x=>x.scoring==='human-review').length};
}
for(const stage of ['offline','adapter','guarded']){
 buckets[stage]={overall:stats(rows,stage),byLanguage:{},byGroup:{}};
 for(const lang of ['zh','en','fr'])buckets[stage].byLanguage[lang]=stats(rows.filter(x=>x.lang===lang),stage);
 for(const group of [...new Set(data.items.map(x=>x.group))])buckets[stage].byGroup[group]=stats(rows.filter(x=>x.group===group),stage);
}
const summary={completedAt:new Date().toISOString(),attempted:rows.length,total:data.items.length,providerErrors:rows.filter(x=>x.error).length,
 stopReason,scope:metadata.surface,warning:'Exploratory AI-written cases, not a human independent blind benchmark; ambiguous samples excluded from mechanical scores.',buckets};
await writeFile(path.join(outputDir,'summary.json'),JSON.stringify(summary,null,2)+'\n');
console.log(`Saved ${rows.length}/${data.items.length} synthetic cases to ${outputDir}; errors: ${summary.providerErrors}; stop: ${stopReason||'none'}`);
