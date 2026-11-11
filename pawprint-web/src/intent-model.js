// Small trained intent classifier (multinomial logistic regression over character n-grams).
// Browser-safe: no Node APIs. The model JSON is produced by eval/intent/train.mjs from a
// small AI-drafted dataset pending team review; this offline experiment is not connected to the website.
import {explainCommand} from './commands.js';

export const INTENT_LABELS=['none','come','home','walk','run','wag','jump','stop'];

export function normalizeIntentText(input){
 return String(input??'').normalize('NFKC').toLowerCase().replace(/[’‘`´]/g,"'").replace(/[“”„«»「」『』"]/g,'"').replace(/\s+/g,' ').trim();
}

// Tokens: runs of Han characters, runs of other letters/digits/apostrophes, or single symbols.
// Each word-like token is padded with "_" boundary markers, then cut into 1–3 character grams.
export function featurize(input){
 const text=normalizeIntentText(input),features=new Set();
 for(const token of text.match(/\p{Script=Han}+|(?:(?!\p{Script=Han})[\p{L}\p{N}'])+|[^\s\p{L}\p{N}]/gu)||[]){
  if(!/[\p{L}\p{N}]/u.test(token)){features.add('p:'+token);continue;}
  features.add('w:'+token);
  const chars=['_',...token,'_'];
  for(let n=1;n<=3;n++)for(let i=0;i+n<=chars.length;i++){
   const gram=chars.slice(i,i+n).join('');
   if(gram!=='_')features.add('c:'+gram);
  }
 }
 return [...features];
}

export function softmax(logits){
 const max=Math.max(...logits),exps=logits.map(x=>Math.exp(x-max)),sum=exps.reduce((a,b)=>a+b,0);
 return exps.map(x=>x/sum);
}

// model: {labels, bias:number[], scale:number, weights:{feature:int[]}} (weights quantized by scale).
export function intentLogits(model,input){
 const known=featurize(input).filter(f=>Object.hasOwn(model.weights,f)),norm=known.length?1/Math.sqrt(known.length):0;
 const logits=[...model.bias];
 for(const f of known){const w=model.weights[f];for(let k=0;k<logits.length;k++)logits[k]+=w[k]*model.scale*norm;}
 return logits;
}

export function predictIntent(model,input){
 const probs=softmax(intentLogits(model,input));
 let best=0;for(let k=1;k<probs.length;k++)if(probs[k]>probs[best])best=k;
 const label=model.labels[best];
 return {action:label==='none'?null:label,label,confidence:probs[best],probs:Object.fromEntries(model.labels.map((l,k)=>[l,probs[k]]))};
}

// Rules first. A rule abstention caused by negation or quoted text is final (the classifier
// never overrides it). Otherwise the classifier may act only when confident enough.
export function hybridCommand(model,input,{threshold=model?.threshold??0.6}={}){
 const rule=explainCommand(input);
 if(rule.action)return {action:rule.action,source:'rules',reason:rule.reason,confidence:1};
 if(rule.reason==='negated'||rule.reason==='quoted-text'||rule.reason==='empty')return {action:null,source:'rules',reason:rule.reason,confidence:1};
 const guess=predictIntent(model,input);
 if(guess.action&&guess.confidence>=threshold)return {action:guess.action,source:'classifier',reason:'classifier-confident',confidence:guess.confidence};
 return {action:null,source:'classifier',reason:guess.action?'below-threshold':'classifier-none',confidence:guess.confidence};
}
