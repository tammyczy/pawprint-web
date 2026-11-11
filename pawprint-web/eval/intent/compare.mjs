// node eval/intent/compare.mjs — compares rule parsers, the trained classifier, the hybrid and (optionally) the LLM.
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parseCommand} from '../../src/commands.js';
import {baselineCommand} from '../baseline-commands.js';
import {predictIntent,hybridCommand} from '../../src/intent-model.js';
import {summarize,compact,round,crossValidate,sweep,toExpected,THRESHOLDS} from './trainer.mjs';
import {evaluateComparison} from './compare-evaluation.mjs';

const read=path=>readFile(new URL(path,import.meta.url));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const exists=path=>access(new URL(path,import.meta.url)).then(()=>true,()=>false);

const casesBytes=await read('../cases.json'),trainBytes=await read('./train.json'),modelBytes=await read('./model.json');
const cases=JSON.parse(casesBytes),{items:train}=JSON.parse(trainBytes),model=JSON.parse(modelBytes);
const blindBytes=await exists('./blind-test.json')?await read('./blind-test.json'):null;
const blindRaw=blindBytes?JSON.parse(blindBytes):null;
const blind=blindRaw?(Array.isArray(blindRaw)?blindRaw:blindRaw.items||[]).filter(x=>!x.example).map(x=>({...x,expected:toExpected(x),group:x.group||x.lang||'blind'})):null;

let llm=null,llmStatus='skipped: no key (set OPENAI_API_KEY to include the LLM)';
if(process.env.OPENAI_API_KEY){
 const {createCompanionAI}=await import('../../server/companion-ai.mjs');
 const reply=createCompanionAI({apiKey:process.env.OPENAI_API_KEY,model:process.env.OPENAI_MODEL||undefined});
 llmStatus='ran';
 llm=async text=>{try{return (await reply({name:'Lanlao',kind:'dog',text})).action;}catch(error){return {error:error.message};}};
}

const systems={
 baseline:text=>baselineCommand(text),
 rules:text=>parseCommand(text),
 classifier:text=>predictIntent(model,text).action,
 hybrid:text=>hybridCommand(model,text).action
};
const evaluate=data=>evaluateComparison(data,{systems,llm,llmStatus,describe:text=>({
 hybridSource:hybridCommand(model,text).source,
 classifierConfidence:round(predictIntent(model,text).confidence,3)
})});

const dev=await evaluate(cases);
const blindResult=blind?await evaluate(blind):{status:'not present: create eval/intent/blind-test.json (see 盲測集填寫說明.md)'};

// Learning curve: 5-fold CV on train.json at increasing fractions of each training split.
const learningCurve=[];
for(const fraction of [0.1,0.25,0.5,0.75,1]){
 const oof=crossValidate(train,{k:5,seed:2026,fraction});
 const cls=summarize(oof.map(r=>({...r,actual:predictIntent(r.model,r.text).action})));
 const hyb=summarize(oof.map(r=>({...r,actual:hybridCommand(r.model,r.text,{threshold:model.threshold}).action})));
 learningCurve.push({fraction,meanTrainSize:round(oof.reduce((a,r)=>a+r.trainSize,0)/oof.length,1),
  classifierCV:{accuracy:round(cls.accuracy),macroF1:round(cls.macroF1),falseActionRate:round(cls.falseActionRate)},
  hybridCV:{accuracy:round(hyb.accuracy),macroF1:round(hyb.macroF1),falseActionRate:round(hyb.falseActionRate)}});
}
const rulesOnTrain=Object.fromEntries([['baseline',baselineCommand],['rules',parseCommand]].map(([n,f])=>[n,compact(summarize(train.map(it=>({expected:toExpected(it),actual:f(it.text)}))))]));
const oof=crossValidate(train,{k:5,seed:2026});
const thresholdSweep={chosen:model.threshold,rule:model.thresholdRule,thresholds:THRESHOLDS,
 trainOutOfFold:sweep(oof,r=>r.model),
 devCases_forTransparencyOnly:sweep(cases,()=>model)};

const report={schemaVersion:1,generatedAt:new Date().toISOString(),
 scope:'Offline command-intent recognition only (text -> one of come/home/walk/run/wag/jump/stop or none). No user outcomes, speech recognition, clinical efficacy, or competition score measured. LLM column only when an API key is present.',
 method:'cases.json is a DEVELOPMENT set (author-written, seen while building; not blind). Classifier: softmax regression on character 1-3 grams, trained on train.json seed drafts written by an AI assistant for the team to review. train.mjs refuses to train if any training sentence is identical or near-identical (>=0.85 char similarity) to cases.json. Learning curve and threshold choice use 5-fold cross-validation on train.json only. blind-test.json, when present, should be written by people who never saw train.json. Provider failures are excluded from scored totals and confusion matrices and listed separately as errors and requests; no scored outputs means metrics are unavailable. Small datasets: differences of one or two cases are noise.',
 datasetSha256:{cases:sha(casesBytes),train:sha(trainBytes),blindTest:blindBytes?sha(blindBytes):null},
 modelSha256:sha(modelBytes),codeSha256:{intentModel:sha(await read('../../src/intent-model.js')),rules:sha(await read('../../src/commands.js'))},
 model:{features:model.features,bytes:modelBytes.length,trainingExamples:model.trainingExamples,threshold:model.threshold},
 llm:llmStatus,
 dev,blind:blindResult,learningCurve,rulesOnTrainForReference:rulesOnTrain,thresholdSweep};
await mkdir(new URL('../../public/evidence/',import.meta.url),{recursive:true});
await writeFile(new URL('../../public/evidence/intent-comparison.json',import.meta.url),JSON.stringify(report,null,1)+'\n');

const fmt=value=>value===null?'n/a':value.toFixed(3);
const line=s=>s.status||`acc ${fmt(s.accuracy)}  macroF1 ${fmt(s.macroF1)}  falseAction ${s.falseActions}/${s.negativeCases} (${fmt(s.falseActionRate)})  missed ${s.missedActions}  wrong ${s.wrongActions}  scored ${s.total}/${s.requests}  errors ${s.errors}`;
console.log('DEV set (cases.json, not blind), n='+cases.length);
for(const [n,s] of Object.entries(dev.systems))console.log(' '+n.padEnd(11)+line(s));
if(blind){console.log('BLIND set, n='+blind.length);for(const [n,s] of Object.entries(blindResult.systems))console.log(' '+n.padEnd(11)+line(s));}
else console.log('BLIND set: '+blindResult.status);
console.log('Learning curve (5-fold CV on train.json, classifier):');
for(const p of learningCurve)console.log(` ${String(p.fraction*100).padStart(3)}%  n≈${p.meanTrainSize}  acc ${p.classifierCV.accuracy}  macroF1 ${p.classifierCV.macroF1}  falseAction ${p.classifierCV.falseActionRate}  | hybrid acc ${p.hybridCV.accuracy} falseAction ${p.hybridCV.falseActionRate}`);
console.log(` reference on all of train.json: rules acc ${rulesOnTrain.rules.accuracy} falseAction ${rulesOnTrain.rules.falseActionRate}; baseline acc ${rulesOnTrain.baseline.accuracy} falseAction ${rulesOnTrain.baseline.falseActionRate}`);
console.log(`Hybrid threshold ${model.threshold} (chosen on train CV). Dev sweep: `+thresholdSweep.devCases_forTransparencyOnly.map(p=>`${p.threshold}:${p.accuracy}/${p.falseActionRate}`).join(' '));
console.log('Hybrid failures on dev: '+dev.rows.filter(r=>r.hybrid!==r.expected).map(r=>`${r.id}(${r.hybrid??'null'})`).join(' '));
console.log('Wrote public/evidence/intent-comparison.json');
