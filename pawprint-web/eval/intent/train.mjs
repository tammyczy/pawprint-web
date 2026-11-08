// node eval/intent/train.mjs — trains the intent classifier from eval/intent/train.json.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {INTENT_LABELS} from '../../src/intent-model.js';
import {trainModel,findOverlaps,overlapKey,crossValidate,sweep,chooseThreshold,summarize,compact,predictIntent,toExpected,SAFETY_CAP} from './trainer.mjs';

const trainBytes=await readFile(new URL('./train.json',import.meta.url));
const {items}=JSON.parse(trainBytes);
const cases=JSON.parse(await readFile(new URL('../cases.json',import.meta.url)));

const problems=[];
const ids=new Set(),keys=new Map();
for(const it of items){
 if(!it.id||ids.has(it.id))problems.push(`duplicate or missing id: ${it.id}`);ids.add(it.id);
 if(!INTENT_LABELS.includes(it.label))problems.push(`${it.id}: unknown label ${it.label}`);
 if(typeof it.text!=='string'||!it.text.trim())problems.push(`${it.id}: empty text`);
 const key=overlapKey(it.text);if(keys.has(key))problems.push(`${it.id}: duplicate of ${keys.get(key)}`);keys.set(key,it.id);
}
const overlaps=findOverlaps(items,cases);
for(const o of overlaps)problems.push(`${o.kind} overlap with dev set: ${o.trainId} "${o.trainText}" ~ ${o.evalId} "${o.evalText}" (similarity ${o.similarity})`);
if(problems.length){console.error('Training refused:\n- '+problems.join('\n- '));process.exit(1);}

// Choose the hybrid threshold from out-of-fold predictions on the TRAINING data only.
const oof=crossValidate(items,{k:5,seed:2026});
const points=sweep(oof,r=>r.model);
const threshold=chooseThreshold(points);
const cv=compact(summarize(oof.map(r=>({...r,actual:predictIntent(r.model,r.text).action}))));

const model=trainModel(items,{threshold});
model.trainingDataSha256=createHash('sha256').update(trainBytes).digest('hex');
model.thresholdRule=`5-fold out-of-fold hybrid predictions on train.json: most accurate threshold whose false-action rate <= ${SAFETY_CAP} (cases.json not used)`;
const json=JSON.stringify(model)+'\n';
await writeFile(new URL('./model.json',import.meta.url),json);
await mkdir(new URL('../../public/models/',import.meta.url),{recursive:true});
await writeFile(new URL('../../public/models/intent-model.json',import.meta.url),json);

const fit=compact(summarize(items.map(it=>({expected:toExpected(it),actual:predictIntent(model,it.text).action}))));
const count=(k)=>Object.fromEntries([...new Set(items.map(x=>x[k]))].map(v=>[v,items.filter(x=>x[k]===v).length]));
console.log(JSON.stringify({
 examples:items.length,byLabel:count('label'),byLang:count('lang'),
 overlapCheck:{devCases:cases.length,exactOrNear:overlaps.length},
 features:{beforePruning:model.vocabularyBeforePruning,kept:model.features},
 modelBytes:Buffer.byteLength(json),
 trainingFit:{accuracy:fit.accuracy,macroF1:fit.macroF1},
 crossValidation5Fold:{accuracy:cv.accuracy,macroF1:cv.macroF1,falseActionRate:cv.falseActionRate},
 chosenThreshold:threshold,thresholdSweepOutOfFold:points.map(p=>`${p.threshold}: acc ${p.accuracy} false ${p.falseActionRate}`),
 wrote:['eval/intent/model.json','public/models/intent-model.json']
},null,1));
