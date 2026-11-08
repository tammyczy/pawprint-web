// Training + evaluation helpers shared by train.mjs, compare.mjs and intent-model.test.js.
import {INTENT_LABELS,featurize,normalizeIntentText,predictIntent,hybridCommand} from '../../src/intent-model.js';

export function mulberry32(seed){
 let a=seed>>>0;
 return ()=>{a=(a+0x6d2b79f5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
}
export function shuffled(items,rng){
 const out=[...items];
 for(let i=out.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[out[i],out[j]]=[out[j],out[i]];}
 return out;
}

// ---------- training: softmax regression, seeded SGD, L2, df pruning, int8-style quantization ----------
export const DEFAULTS={seed:2026,epochs:40,learningRate:0.8,l2:0.0005,minDocFreq:2,quantLevels:127,minWeight:1};
export function trainModel(items,options={}){
 const o={...DEFAULTS,...options},labels=INTENT_LABELS,K=labels.length;
 const docs=items.map(item=>({features:featurize(item.text),y:labels.indexOf(item.label??'none')}));
 if(docs.some(d=>d.y<0))throw new Error('unknown label in training data');
 const df=new Map();
 for(const d of docs)for(const f of d.features)df.set(f,(df.get(f)||0)+1);
 const vocab=[...df.keys()].filter(f=>df.get(f)>=o.minDocFreq).sort();
 const index=new Map(vocab.map((f,i)=>[f,i]));
 const W=vocab.map(()=>new Float64Array(K)),b=new Float64Array(K);
 const encoded=docs.map(d=>{const ids=d.features.filter(f=>index.has(f)).map(f=>index.get(f));return {ids,norm:ids.length?1/Math.sqrt(ids.length):0,y:d.y};});
 const rng=mulberry32(o.seed);
 for(let epoch=0;epoch<o.epochs;epoch++){
  const lr=o.learningRate/(1+0.1*epoch);
  for(const d of shuffled(encoded,rng)){
   const z=Array.from(b);
   for(const id of d.ids)for(let k=0;k<K;k++)z[k]+=W[id][k]*d.norm;
   const max=Math.max(...z),e=z.map(v=>Math.exp(v-max)),s=e.reduce((x,y)=>x+y,0);
   for(let k=0;k<K;k++){
    const g=e[k]/s-(k===d.y?1:0);
    b[k]-=lr*g;
    for(const id of d.ids)W[id][k]-=lr*(g*d.norm+o.l2*W[id][k]);
   }
  }
 }
 let maxAbs=0;for(const w of W)for(const v of w)maxAbs=Math.max(maxAbs,Math.abs(v));
 const scale=(maxAbs||1)/o.quantLevels,weights={};
 vocab.forEach((f,i)=>{const q=Array.from(W[i],v=>Math.round(v/scale)||0);if(q.some(v=>Math.abs(v)>=o.minWeight))weights[f]=q;});
 return {format:'pawprint-intent-logreg',version:1,labels,featurizer:'NFKC lowercase; tokens = Han runs | letter/digit runs | symbols; "_"-padded char 1-3 grams + whole-token + symbol features',
  hyperparameters:{seed:o.seed,epochs:o.epochs,learningRate:o.learningRate,l2:o.l2,minDocFreq:o.minDocFreq},
  trainingExamples:items.length,vocabularyBeforePruning:df.size,features:Object.keys(weights).length,
  threshold:o.threshold??0.6,scale:Number(scale.toPrecision(6)),bias:Array.from(b,v=>Number(v.toFixed(4))),weights};
}

// ---------- train/test leakage check ----------
export function overlapKey(text){
 return normalizeIntentText(text).replace(/^(?:lanlao|蓝老|藍老|xiaoq|小q)[\s,，:：]*/u,'').replace(/[^\p{L}\p{N}]/gu,'');
}
function levenshtein(a,b){
 a=[...a];b=[...b];let prev=Array.from({length:b.length+1},(_,j)=>j);
 for(let i=1;i<=a.length;i++){const cur=[i];for(let j=1;j<=b.length;j++)cur[j]=Math.min(prev[j]+1,cur[j-1]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));prev=cur;}
 return prev[b.length];
}
export function similarity(a,b){const x=overlapKey(a),y=overlapKey(b),n=Math.max([...x].length,[...y].length);return n?1-levenshtein(x,y)/n:1;}
// exact: identical after normalization; near: >= nearThreshold character similarity.
export function findOverlaps(trainItems,evalItems,{nearThreshold=0.85}={}){
 const found=[];
 for(const t of trainItems)for(const e of evalItems){
  const exact=overlapKey(t.text)===overlapKey(e.text),sim=exact?1:similarity(t.text,e.text);
  if(exact||sim>=nearThreshold)found.push({trainId:t.id,evalId:e.id,trainText:t.text,evalText:e.text,kind:exact?'exact':'near',similarity:Number(sim.toFixed(3))});
 }
 return found;
}

// ---------- metrics ----------
const lab=a=>a??'none';
export function summarize(rows){
 const total=rows.length,correct=rows.filter(r=>r.actual===r.expected).length;
 const negatives=rows.filter(r=>r.expected===null),positives=rows.filter(r=>r.expected!==null);
 const falseActions=negatives.filter(r=>r.actual!==null).length;
 const f1s=INTENT_LABELS.filter(l=>rows.some(r=>lab(r.expected)===l||lab(r.actual)===l)).map(l=>{
  const tp=rows.filter(r=>lab(r.expected)===l&&lab(r.actual)===l).length,fp=rows.filter(r=>lab(r.expected)!==l&&lab(r.actual)===l).length,fn=rows.filter(r=>lab(r.expected)===l&&lab(r.actual)!==l).length;
  return tp?2*tp/(2*tp+fp+fn):0;
 });
 return {correct,total,accuracy:total?correct/total:0,macroF1:f1s.length?f1s.reduce((a,b)=>a+b,0)/f1s.length:0,
  falseActions,negativeCases:negatives.length,falseActionRate:negatives.length?falseActions/negatives.length:0,
  missedActions:positives.filter(r=>r.actual===null).length,wrongActions:positives.filter(r=>r.actual!==null&&r.actual!==r.expected).length};
}
export function confusion(rows){
 const m=Object.fromEntries(INTENT_LABELS.map(e=>[e,Object.fromEntries(INTENT_LABELS.map(a=>[a,0]))]));
 for(const r of rows)m[lab(r.expected)][lab(r.actual)]++;
 return m;
}
export const round=(x,d=4)=>Number(x.toFixed(d));
export const compact=s=>({accuracy:round(s.accuracy),macroF1:round(s.macroF1),falseActionRate:round(s.falseActionRate),falseActions:s.falseActions,negativeCases:s.negativeCases,missedActions:s.missedActions,wrongActions:s.wrongActions,correct:s.correct,total:s.total});
export const toExpected=item=>item.expected!==undefined?item.expected:(item.label==='none'?null:item.label);

// ---------- cross-validation ----------
// Stratified k folds (seeded). fraction<1 subsamples each training split (seeded, stratified).
export function folds(items,k,seed){
 const rng=mulberry32(seed),out=Array.from({length:k},()=>[]);
 const byLabel=new Map();for(const it of items){const l=it.label;if(!byLabel.has(l))byLabel.set(l,[]);byLabel.get(l).push(it);}
 let next=0;
 for(const l of [...byLabel.keys()].sort())for(const it of shuffled(byLabel.get(l),rng))out[next++%k].push(it);
 return out;
}
export function subsample(items,fraction,seed){
 if(fraction>=1)return items;
 const rng=mulberry32(seed),byLabel=new Map();
 for(const it of items){if(!byLabel.has(it.label))byLabel.set(it.label,[]);byLabel.get(it.label).push(it);}
 return [...byLabel.keys()].sort().flatMap(l=>shuffled(byLabel.get(l),rng).slice(0,Math.max(1,Math.round(byLabel.get(l).length*fraction))));
}
// Returns out-of-fold rows: {item, expected, model} for each training item.
export function crossValidate(items,{k=5,seed=2026,fraction=1,trainOptions={}}={}){
 const parts=folds(items,k,seed),rows=[];
 parts.forEach((test,i)=>{
  const train=subsample(parts.filter((_,j)=>j!==i).flat(),fraction,seed+i);
  const model=trainModel(train,{...trainOptions,seed:(trainOptions.seed??seed)+i});
  for(const item of test)rows.push({id:item.id,text:item.text,expected:toExpected(item),model,trainSize:train.length});
 });
 return rows;
}
export const THRESHOLDS=[0.3,0.35,0.4,0.45,0.5,0.55,0.6,0.65,0.7,0.75,0.8,0.85,0.9,0.95];
export function sweep(rows,modelFor){
 return THRESHOLDS.map(t=>{const s=summarize(rows.map(r=>({...r,actual:hybridCommand(modelFor(r),r.text,{threshold:t}).action})));return {threshold:t,accuracy:round(s.accuracy),macroF1:round(s.macroF1),falseActionRate:round(s.falseActionRate),falseActions:s.falseActions,missedActions:s.missedActions};});
}
// Threshold rule (decided before looking at cases.json): on out-of-fold training predictions,
// among thresholds whose hybrid false-action rate is <= SAFETY_CAP pick the most accurate
// (ties -> higher threshold). If none qualifies, take the highest threshold.
export const SAFETY_CAP=0.05;
export function chooseThreshold(points){
 const ok=points.filter(p=>p.falseActionRate<=SAFETY_CAP);
 if(!ok.length)return THRESHOLDS.at(-1);
 return ok.reduce((best,p)=>p.accuracy>best.accuracy||(p.accuracy===best.accuracy&&p.threshold>best.threshold)?p:best).threshold;
}
export {predictIntent,hybridCommand};
