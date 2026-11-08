import fs from 'node:fs';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
globalThis.self=globalThis;globalThis.ProgressEvent=class {};
async function load(path){const b=fs.readFileSync(path);return new Promise((resolve,reject)=>new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'',resolve,reject));}
const [before,after]=await Promise.all([load(process.argv[2]),load(process.argv[3])]);
const names=['Walk_Refined','Run_Trot_Natural','Tail_Wag_Natural','Jump_Natural'];let failed=false;
for(const name of names){const a=before.animations.find(x=>x.name===name),b=after.animations.find(x=>x.name===name);if(!a||!b){console.log(name,'MISSING');failed=true;continue;}
 const dt=Math.abs(a.duration-b.duration);const bt=new Map(b.tracks.map(t=>[t.name,t]));let missing=[],max=0,worst='';
 for(const old of a.tracks){let track=bt.get(old.name);if(!track && old.name.endsWith('.morphTargetInfluences')){const morphs=b.tracks.filter(t=>t.name.endsWith('.morphTargetInfluences'));if(morphs.length===1)track=morphs[0];}if(!track){missing.push(old.name);continue;}if(old.getValueSize()!==track.getValueSize()){missing.push(old.name+' (dimension)');continue;}
  const ia=old.createInterpolant(),ib=track.createInterpolant();for(let i=0;i<=64;i++){const t=a.duration*i/64,va=ia.evaluate(t),vb=ib.evaluate(t);let err=0;if(old.name.endsWith('.quaternion')&&va.length===4){const dot=Math.abs(va.reduce((sum,v,j)=>sum+v*vb[j],0));const la=Math.hypot(...va),lb=Math.hypot(...vb);err=2*Math.acos(Math.min(1,dot/(la*lb))); }else for(let j=0;j<va.length;j++)err=Math.max(err,Math.abs(va[j]-vb[j]));if(err>max){max=err;worst=old.name;}}
 }
 console.log(JSON.stringify({clip:name,before:a.duration,after:b.duration,missing:missing.length,examples:missing.slice(0,3),maxSampleError:max,worst}));if(dt>1e-5||missing.length||max>.005)failed=true;
}
if(failed)process.exitCode=1;
