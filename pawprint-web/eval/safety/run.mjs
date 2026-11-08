// Companion safety evaluation. Live: OPENAI_API_KEY set -> N runs per case through createCompanionAI, raw outputs saved.
// Offline: --replay <outputs.json> re-scores saved outputs. Neither: explains and exits 0.
// Usage: node --env-file=.env eval/safety/run.mjs [--runs 3] [--replay file] [--out evidence.json]
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import {createCompanionAI,detectReplyLanguage} from '../../server/companion-ai.mjs';
import {scoreResult,summarize} from './checks.mjs';

const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../..');
const SCOPE='LLM companion replies to author-written safety prompts (grief, identity honesty, dependency, secrecy, crisis, medical claims, prompt injection, action safety). Measures only what automated keyword/regex checks can see in 1–2 sentence captions; no user outcomes, clinical efficacy, or real-world harm rate measured.';
const METHOD='Each case is sent N times (LLMs are nondeterministic). Deterministic checks: reply script/language, emoji, sentence count, digit runs, action. Keyword heuristics (AI disclosure, human-support referral, dependency, secrecy, therapy claims) return pass only on positive evidence and needs-human when unsure. needs-human runs are NOT counted as passes and must be rated by at least two people (see eval/safety/README.md). Author-written cases; not a blind or representative benchmark.';

export function parseArgs(argv){
 const args={runs:3,replay:null,out:null};
 for(let i=0;i<argv.length;i++){
  const a=argv[i];
  if(a==='--runs')args.runs=Number(argv[++i]);
  else if(a==='--replay')args.replay=argv[++i];
  else if(a==='--out')args.out=argv[++i];
  else throw new Error(`Unknown argument: ${a}`);
 }
 if(!Number.isInteger(args.runs)||args.runs<1||args.runs>20)throw new Error('--runs must be an integer from 1 to 20');
 if(args.replay==='')throw new Error('--replay needs a file');
 return args;
}
export async function loadCases(file=path.join(here,'cases.json')){
 const bytes=await readFile(file);
 return {cases:JSON.parse(bytes),sha256:createHash('sha256').update(bytes).digest('hex')};
}
// Live collection: every case x runs, bounded concurrency, errors recorded rather than thrown.
export async function collect({cases,runs,respond,concurrency=3}){
 const jobs=cases.flatMap(c=>Array.from({length:runs},(_,i)=>({c,run:i+1}))),results=[];
 let next=0;
 async function worker(){
  while(next<jobs.length){
   const {c,run}=jobs[next++];
   try{results.push({caseId:c.id,run,reply:await respond({name:c.petName,kind:c.kind,text:c.text,history:c.history||[]})});}
   catch(error){results.push({caseId:c.id,run,reply:null,error:String(error.message||error)});}
  }
 }
 await Promise.all(Array.from({length:Math.min(concurrency,jobs.length)},worker));
 return results.sort((a,b)=>a.caseId.localeCompare(b.caseId)||a.run-b.run);
}
export function score({cases,outputs}){
 const byId=new Map(cases.map(c=>[c.id,c])),unknown=[];
 const rows=[];
 for(const item of outputs.results||[]){const c=byId.get(item.caseId);if(c)rows.push(scoreResult(item,c));else unknown.push(item.caseId);}
 return {rows,unknown:[...new Set(unknown)]};
}
// Known limit of the app itself: the prompt language comes from detectReplyLanguage on the user's text.
export const inputLanguageMismatches=cases=>cases.filter(c=>c.expect.replyLanguage&&detectReplyLanguage(c.text)!==c.expect.replyLanguage).map(c=>({id:c.id,expected:c.expect.replyLanguage,appWillRequest:detectReplyLanguage(c.text)}));
const csvCell=v=>/[",\n\r]/.test(String(v??''))?`"${String(v??'').replace(/"/g,'""')}"`:String(v??'');
export function ratingCsv(rows,cases){
 const byId=new Map(cases.map(c=>[c.id,c]));
 const head=['case_id','category','run','text','reply','auto_verdict','rater','warmth(1-5)','honesty(1-5)','safety(1-5)','language(1-5)','notes'];
 return '﻿'+[head,...rows.map(x=>[x.caseId,x.category,x.run,byId.get(x.caseId).text,x.caption??`[error] ${x.error}`,x.verdict,'','','','','',''])].map(r=>r.map(csvCell).join(',')).join('\n')+'\n';
}

export async function main(argv=process.argv.slice(2),{env=process.env,fetchImpl=fetch,log=console.log,outputsDir=path.join(here,'outputs'),evidencePath=path.join(root,'public/evidence/companion-safety.json')}={}){
 const args=parseArgs(argv),{cases,sha256}=await loadCases();
 let outputs,source;
 if(args.replay){
  outputs=JSON.parse(await readFile(args.replay,'utf8'));source=path.relative(root,path.resolve(args.replay));
 }else if(env.OPENAI_API_KEY){
  const model=env.OPENAI_MODEL||'gpt-5.4-mini';
  const respond=createCompanionAI({apiKey:env.OPENAI_API_KEY,model,fetchImpl});
  log(`Running ${cases.length} cases x ${args.runs} runs with ${model}…`);
  outputs={schemaVersion:1,synthetic:false,generatedAt:new Date().toISOString(),model,runsPerCase:args.runs,datasetSha256:sha256,results:await collect({cases,runs:args.runs,respond})};
  await mkdir(outputsDir,{recursive:true});
  const file=path.join(outputsDir,`${outputs.generatedAt.replace(/[:.]/g,'-')}.json`);
  await writeFile(file,JSON.stringify(outputs,null,2)+'\n');source=path.relative(root,file);
  log(`Raw outputs saved: ${file}`);
 }else{
  log('No OPENAI_API_KEY and no --replay file: nothing was evaluated and no evidence was written.\nLive run:  node --env-file=.env eval/safety/run.mjs --runs 3\nOffline:   node eval/safety/run.mjs --replay eval/safety/outputs/<timestamp>.json');
  return 0;
 }
 const {rows,unknown}=score({cases,outputs}),summary=summarize(rows);
 const report={schemaVersion:1,generatedAt:new Date().toISOString(),synthetic:!!outputs.synthetic,...(outputs.synthetic?{warning:'SYNTHETIC hand-written outputs for testing the scorer only. Not evidence of model behaviour.'}:{}),scope:SCOPE,method:METHOD,model:outputs.model||null,runsPerCase:outputs.runsPerCase||null,outputsFile:source,outputsGeneratedAt:outputs.generatedAt||null,datasetSha256:sha256,outputsDatasetSha256:outputs.datasetSha256||null,datasetMatchesOutputs:outputs.datasetSha256===sha256,caseCount:cases.length,casesScored:new Set(rows.map(x=>x.caseId)).size,unknownCaseIds:unknown,inputLanguageMismatches:inputLanguageMismatches(cases),summary,rows};
 if(!report.datasetMatchesOutputs)log('Warning: outputs were produced with a different cases.json; results are re-scored against the current file.');
 log(JSON.stringify({synthetic:report.synthetic,model:report.model,scored:summary.scored,pass:summary.pass,fail:summary.fail,needsHuman:summary.needsHuman,errors:summary.errors,byCategory:Object.fromEntries(Object.entries(summary.byCategory).map(([k,v])=>[k,`${v.pass} pass / ${v.fail} fail / ${v.needsHuman} needs-human / ${v.errors} error`]))},null,2));
 // Synthetic fixtures never overwrite public evidence; they are written only to an explicit --out path.
 const target=args.out?path.resolve(args.out):outputs.synthetic?null:evidencePath;
 if(!summary.scored)log('Nothing was scored (all runs errored or no known cases); evidence not written.');
 else if(!target)log('Synthetic outputs: report not written to public/evidence (use --out to save it elsewhere).');
 else{
  await mkdir(path.dirname(target),{recursive:true});await writeFile(target,JSON.stringify(report,null,2)+'\n');log(`Report written: ${target}`);
  if(!outputs.synthetic&&!args.replay){const csv=path.join(outputsDir,`${outputs.generatedAt.replace(/[:.]/g,'-')}.rating.csv`);await writeFile(csv,ratingCsv(rows,cases));log(`Rating sheet for human raters: ${csv}`);}
 }
 return summary.errors&&!summary.scored?1:0;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{process.exitCode=await main();}catch(error){console.error(error.message);process.exitCode=1;}
}
