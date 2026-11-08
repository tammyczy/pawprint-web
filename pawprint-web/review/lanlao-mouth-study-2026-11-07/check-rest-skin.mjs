// Compare renderer-visible original body skin outside the mouth. This permits intentional mouth retopology.
import {NodeIO} from '@gltf-transform/core';import {ALL_EXTENSIONS} from '@gltf-transform/extensions';import {MeshoptDecoder} from 'meshoptimizer';
await MeshoptDecoder.ready;const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const roots=await Promise.all(process.argv.slice(2,4).map(async path=>(await io.read(path)).getRoot()));
function body(root){const joints=root.listSkins()[0].listJoints();const candidates=root.listMeshes().flatMap(m=>m.listPrimitives()).filter(p=>p.getAttribute('POSITION')&&p.getAttribute('WEIGHTS_0'));const prim=candidates.sort((a,b)=>b.getAttribute('POSITION').getCount()-a.getAttribute('POSITION').getCount())[0];return {p:prim.getAttribute('POSITION'),w:prim.getAttribute('WEIGHTS_0'),ids:prim.getAttribute('JOINTS_0'),joints};}
function key(p){return p.map(v=>Math.floor(v*10000)).join(',');}
function weights(geom,i){const ws=geom.w.getElement(i,[]),js=geom.ids.getElement(i,[]),sum=ws.reduce((a,b)=>a+b,0),o={};for(let j=0;j<4;j++){const n=geom.joints[js[j]]?.getName();if(!n)throw Error('Invalid joint index '+js[j]);o[n]=(o[n]||0)+(sum?ws[j]/sum:0);}return o;}
const [a,b]=roots.map(body),pos=new Map();for(let i=0;i<b.p.getCount();i++){let p=b.p.getElement(i,[]),k=key(p);if(!pos.has(k))pos.set(k,[]);pos.get(k).push({p,w:weights(b,i)});}
let examined=0,missing=0,changed=0,maxDifference=0;for(let i=0;i<a.p.getCount();i++){
 let p=a.p.getElement(i,[]);if(p[0]<-.32 && p[1]>.48 && p[1]<.76)continue;examined++;
 const cell=p.map(v=>Math.floor(v*10000)),candidates=[];for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++)for(const item of pos.get([cell[0]+x,cell[1]+y,cell[2]+z].join(','))||[])if(Math.hypot(...item.p.map((v,j)=>v-p[j]))<.00002)candidates.push(item.w);if(!candidates.length){missing++;continue;}const w=weights(a,i);let best=Infinity;
 for(const cand of candidates){let delta=0;for(const n of new Set([...Object.keys(w),...Object.keys(cand)]))delta=Math.max(delta,Math.abs((w[n]||0)-(cand[n]||0)));best=Math.min(best,delta);}
 maxDifference=Math.max(maxDifference,best);if(best>.005)changed++;
}
console.log(JSON.stringify({examined,missing,changed,maxDifference,description:'outside mouth; compares runtime-normalized first 4 weights by bone name'}));
if(missing||changed)process.exitCode=1;
