// Inter-rater agreement for the 1–5 human rating sheets.
// Usage: node eval/safety/agreement.mjs ratings-A.csv ratings-B.csv [more.csv]
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

export const DIMENSIONS=['warmth(1-5)','honesty(1-5)','safety(1-5)','language(1-5)'];
export function parseCsv(text){
 const rows=[];let row=[],cell='',quoted=false;
 text=text.replace(/^﻿/,'');
 for(let i=0;i<text.length;i++){
  const ch=text[i];
  if(quoted){if(ch==='"'&&text[i+1]==='"'){cell+='"';i++;}else if(ch==='"')quoted=false;else cell+=ch;}
  else if(ch==='"')quoted=true;
  else if(ch===','){row.push(cell);cell='';}
  else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell='';}
  else cell+=ch;
 }
 if(cell||row.length){row.push(cell);rows.push(row);}
 const [head,...body]=rows.filter(r=>r.some(Boolean));
 return body.map(r=>Object.fromEntries(head.map((h,i)=>[h.trim(),(r[i]??'').trim()])));
}
// Quadratic-weighted Cohen's kappa on a 1–5 scale: 1 = perfect, 0 = chance level.
export function weightedKappa(a,b,k=5){
 const n=a.length;if(!n)return null;
 const obs=Array.from({length:k},()=>Array(k).fill(0)),ra=Array(k).fill(0),rb=Array(k).fill(0);
 a.forEach((x,i)=>{obs[x-1][b[i]-1]++;ra[x-1]++;rb[b[i]-1]++;});
 let num=0,den=0;
 for(let i=0;i<k;i++)for(let j=0;j<k;j++){const w=(i-j)**2/(k-1)**2;num+=w*obs[i][j];den+=w*ra[i]*rb[j]/n;}
 return den?1-num/den:1;
}
export function agreement(sheets){
 const key=r=>`${r.case_id}#${r.run||1}`,score=v=>/^[1-5]$/.test(v)?Number(v):null;
 const maps=sheets.map(s=>new Map(s.map(r=>[key(r),r]))),pairs=[];
 for(let i=0;i<maps.length;i++)for(let j=i+1;j<maps.length;j++)pairs.push([i,j]);
 const out={raters:sheets.map(s=>s.find(r=>r.rater)?.rater||'?'),dimensions:{},disagreements:[]};
 for(const d of DIMENSIONS){
  const per=pairs.map(([i,j])=>{
   const items=[...maps[i].keys()].filter(k=>maps[j].has(k)).map(k=>[k,score(maps[i].get(k)[d]),score(maps[j].get(k)[d])]).filter(x=>x[1]&&x[2]);
   for(const [k,x,y] of items)if(Math.abs(x-y)>=2)out.disagreements.push({item:k,dimension:d,scores:[x,y],raters:[out.raters[i],out.raters[j]]});
   return {n:items.length,exact:items.filter(x=>x[1]===x[2]).length/(items.length||1),withinOne:items.filter(x=>Math.abs(x[1]-x[2])<=1).length/(items.length||1),kappa:weightedKappa(items.map(x=>x[1]),items.map(x=>x[2]))};
  });
  const avg=f=>per.length?per.reduce((s,x)=>s+(x[f]??0),0)/per.length:null;
  out.dimensions[d]={pairs:per.length,items:Math.min(...per.map(x=>x.n)),exactAgreement:avg('exact'),withinOneAgreement:avg('withinOne'),weightedKappa:avg('kappa')};
 }
 return out;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const files=process.argv.slice(2);
 if(files.length<2){console.log('Need at least two rating CSV files from different raters.');process.exit(0);}
 console.log(JSON.stringify(agreement(await Promise.all(files.map(async f=>parseCsv(await readFile(f,'utf8'))))),null,2));
}
