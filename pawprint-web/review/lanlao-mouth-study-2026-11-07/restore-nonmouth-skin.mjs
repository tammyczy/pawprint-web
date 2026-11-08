// Preserve the source model's two glTF joint/weight sets on unchanged body vertices.
// Only matched position+UV vertices outside the mouth are modified. Refuses ambiguous matches.
// node qa/restore-nonmouth-skin.mjs ORIGINAL.glb CANDIDATE.glb OUTPUT.glb
import fs from 'node:fs';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder,MeshoptEncoder} from 'meshoptimizer';
const [oldPath,newPath,outPath]=process.argv.slice(2);if(!oldPath||!newPath||!outPath||fs.existsSync(outPath))throw Error('Need ORIGINAL CANDIDATE non-existing OUTPUT');
await Promise.all([MeshoptDecoder.ready,MeshoptEncoder.ready]);const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder,'meshopt.encoder':MeshoptEncoder});
const [a,b]=await Promise.all([io.read(oldPath),io.read(newPath)]);
function body(doc){const r=doc.getRoot(),joints=r.listSkins()[0].listJoints(),prims=r.listMeshes().flatMap(m=>m.listPrimitives()).filter(p=>p.getAttribute('POSITION')&&p.getAttribute('WEIGHTS_0'));const prim=prims.sort((x,y)=>y.getAttribute('POSITION').getCount()-x.getAttribute('POSITION').getCount())[0];return {joints,prim,pos:prim.getAttribute('POSITION'),uv:prim.getAttribute('TEXCOORD_0'),w0:prim.getAttribute('WEIGHTS_0'),w1:prim.getAttribute('WEIGHTS_1'),j0:prim.getAttribute('JOINTS_0'),j1:prim.getAttribute('JOINTS_1')};}
const old=body(a),target=body(b);if(!old.uv||!target.uv||!!old.w1!==!!target.w1||!!old.j1!==!!target.j1)throw Error('Unexpected UV or skin attribute structure');
const targetByName=new Map(target.joints.map((j,i)=>[j.getName(),i]));if(targetByName.size!==target.joints.length)throw Error('Duplicate joint names');
const posKey=p=>p.map(x=>Math.floor(x*10000)).join(','),map=new Map();
for(let i=0;i<old.pos.getCount();i++){let p=old.pos.getElement(i,[]),key=posKey(p);if(!map.has(key))map.set(key,[]);map.get(key).push(i);}
function weights(geom,i){let all={};for(const [ids,w] of [[geom.j0,geom.w0],[geom.j1,geom.w1]])if(ids&&w){let ii=ids.getElement(i,[]),ww=w.getElement(i,[]);for(let j=0;j<4;j++){let name=geom.joints[ii[j]]?.getName();if(!name)throw Error('Invalid joint');all[name]=(all[name]||0)+ww[j];}}return all;}
function difference(a,b){let d=0;for(const key of new Set([...Object.keys(a),...Object.keys(b)]))d=Math.max(d,Math.abs((a[key]||0)-(b[key]||0)));return d;}
let restored=0,nomatch=0,ambiguous=0,excluded=0;
for(let i=0;i<target.pos.getCount();i++){
 const p=target.pos.getElement(i,[]),uv=target.uv.getElement(i,[]);if(p[0]<-.32&&p[1]>.48&&p[1]<.76){excluded++;continue;}
 const grid=p.map(v=>Math.floor(v*10000)),matches=[];
 for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++)for(const id of map.get([grid[0]+x,grid[1]+y,grid[2]+z].join(','))||[]){
  const pp=old.pos.getElement(id,[]),u=old.uv.getElement(id,[]);
  if(Math.hypot(...pp.map((v,j)=>v-p[j]))<.00002 && Math.hypot(...u.map((v,j)=>v-uv[j]))<.00002)matches.push(id);
 }
 if(!matches.length){nomatch++;continue;}let first=weights(old,matches[0]);if(matches.some(id=>difference(first,weights(old,id))>.00001)){ambiguous++;continue;}
 const src=matches[0];for(const [oldids,oldw,newids,neww] of [[old.j0,old.w0,target.j0,target.w0],[old.j1,old.w1,target.j1,target.w1]]){
  if(!oldids)continue;const indices=oldids.getElement(src,[]).map(j=>{const name=old.joints[j].getName();const index=targetByName.get(name);if(index===undefined)throw Error('Missing candidate joint '+name);return index;});newids.setElement(i,indices);neww.setElement(i,oldw.getElement(src,[]));
 }
 restored++;
}
console.log(JSON.stringify({restored,nomatch,ambiguous,excluded}));
if(nomatch||ambiguous)throw Error('Unmatched or ambiguous vertices outside mouth; refusing output');
await io.write(outPath,b);console.log('Restored both original weight sets outside mouth; still requires visual and motion validation');
