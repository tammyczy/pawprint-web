// Construct a normalized closed-to-open reference clip from the Blender export's
// separate jaw, mouth and tongue actions. Does not modify original motion clips.
// Usage: node qa/build-jaw-pose-clip.mjs INPUT.glb OUTPUT.glb
import fs from 'node:fs';import {NodeIO} from '@gltf-transform/core';import {ALL_EXTENSIONS} from '@gltf-transform/extensions';import {MeshoptDecoder,MeshoptEncoder} from 'meshoptimizer';import {Quaternion,QuaternionKeyframeTrack,VectorKeyframeTrack} from 'three';
const [input,output]=process.argv.slice(2);if(!input||!output||fs.existsSync(output))throw Error('Need INPUT.glb and non-existing OUTPUT.glb');
await Promise.all([MeshoptDecoder.ready,MeshoptEncoder.ready]);const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder,'meshopt.encoder':MeshoptEncoder}),d=await io.read(input),r=d.getRoot();if(r.listAnimations().some(x=>x.getName()==='Lanlao_Jaw_Smile'))throw Error('Jaw clip already exists');
const allowed=new Set(['Lower_Jaw','Mouth_Interior','Tongue']),existing=new Set(['Walk_Refined','Run_Trot_Natural','Tail_Wag_Natural','Jump_Natural']);
const all=r.listAnimations().filter(x=>!existing.has(x.getName())), jawCandidates=[];
for(const anim of all)for(const ch of anim.listChannels()){if(ch.getTargetNode()?.getName()==='Lower_Jaw'&&ch.getTargetPath()==='rotation'){let arr=ch.getSampler().getOutput().getArray(),t=ch.getSampler().getInput().getArray(),first=new Quaternion().fromArray(arr,0).normalize(),q=new Quaternion(),best=0,idx=-1;for(let i=0;i<t.length;i++){q.fromArray(arr,i*4).normalize();let a=first.angleTo(q);if(a>best){best=a;idx=i;}}if(best>.05)jawCandidates.push({anim,ch,angle:best,start:t[0],open:t[idx]});}}
if(jawCandidates.length!==1)throw Error(`Expected exactly one moving jaw clip, found ${jawCandidates.length}`);const {anim:jawClip,start,open,angle}=jawCandidates[0];
const byObject=new Map();for(const name of allowed){let matches=all.filter(a=>a.listChannels().some(c=>c.getTargetNode()?.getName()===name));if(name==='Lower_Jaw')matches=matches.filter(a=>a===jawClip);if(matches.length!==1)throw Error(`Expected one source action for ${name}, found ${matches.length}`);byObject.set(name,matches[0]);}
const clip=d.createAnimation('Lanlao_Jaw_Smile'),buffer=r.listBuffers()[0]||d.createBuffer(),seen=new Set();
for(const [name,anim] of byObject)for(const ch of anim.listChannels()){
 if(ch.getTargetNode()?.getName()!==name)continue;const path=ch.getTargetPath();if(!['translation','rotation','scale'].includes(path))continue;const key=name+'.'+path;if(seen.has(key))throw Error('Duplicate channel '+key);seen.add(key);
 const sampler=ch.getSampler();if(sampler.getInterpolation()==='STEP'){const values=sampler.getOutput().getArray(),width=path==='rotation'?4:3;if(!values.every((v,i)=>Math.abs(v-values[i%width])<1e-6))throw Error('Varying STEP sampler unsupported: '+key);continue;}if(sampler.getInterpolation()!=='LINEAR')throw Error('Nonlinear sampler unsupported: '+key);
 const inp=sampler.getInput().getArray(),out=sampler.getOutput().getArray(),cls=path==='rotation'?QuaternionKeyframeTrack:VectorKeyframeTrack, track=new cls(key,inp,out),interpolant=track.createInterpolant(),values=[...interpolant.evaluate(start),...interpolant.evaluate(open)];
 const times=d.createAccessor().setType('SCALAR').setArray(new Float32Array([0,1])).setBuffer(buffer),data=d.createAccessor().setType(path==='rotation'?'VEC4':'VEC3').setArray(new Float32Array(values)).setBuffer(buffer);
 const newSampler=d.createAnimationSampler().setInterpolation('LINEAR').setInput(times).setOutput(data);clip.addSampler(newSampler).addChannel(d.createAnimationChannel().setTargetNode(ch.getTargetNode()).setTargetPath(path).setSampler(newSampler));
}
if(!seen.has('Lower_Jaw.rotation')||!seen.has('Tongue.scale')||!seen.has('Mouth_Interior.scale'))throw Error('Required jaw / tongue / mouth channels absent');
await io.write(output,d);console.log(JSON.stringify({source:jawClip.getName(),start,open,angle,tracks:[...seen]}));
