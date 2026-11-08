// Transfer original animation channels without resampling. Usage:
// node qa/restore-original-clips.mjs ORIGINAL.glb JAW_CANDIDATE.glb OUTPUT.glb
// This changes the candidate's GLB layout; verify all resources and web poses after.
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder, MeshoptEncoder} from 'meshoptimizer';
import {Matrix4,Quaternion,Vector3} from 'three';
import fs from 'node:fs';
const [originalPath,candidatePath,outPath]=process.argv.slice(2);
if(!originalPath||!candidatePath||!outPath||fs.existsSync(outPath)) throw Error('Need ORIGINAL.glb CANDIDATE.glb OUTPUT.glb; output must not already exist');
await Promise.all([MeshoptDecoder.ready,MeshoptEncoder.ready]);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder,'meshopt.encoder':MeshoptEncoder});
const [original,candidate]=await Promise.all([io.read(originalPath),io.read(candidatePath)]);
const a=original.getRoot(), b=candidate.getRoot(), names=['Walk_Refined','Run_Trot_Natural','Tail_Wag_Natural','Jump_Natural'];
const oldNodes=a.listNodes(),newNodes=b.listNodes(), oldSkin=a.listSkins()[0],newSkin=b.listSkins()[0];
if(!oldSkin||!newSkin)throw Error('Expected original and candidate to have skins');
const oldJoints=oldSkin.listJoints(),newJoints=newSkin.listJoints(), newJointMap=new Map(newJoints.map(n=>[n.getName(),n]));
if(newJointMap.size!==newJoints.length)throw Error('Candidate contains duplicated joint names');
const q=new Quaternion(),r=new Quaternion();
const near=(x,y,tol=3e-5)=>x.length===y.length&&x.every((n,i)=>Math.abs(n-y[i])<=tol);
for(const old of oldJoints){
 const node=newJointMap.get(old.getName());if(!node)throw Error('Missing original joint '+old.getName());
 if(old.getParentNode()?.getName()!==node.getParentNode()?.getName())throw Error('Changed hierarchy: '+old.getName());
 for(const method of ['getTranslation','getScale'])if(!near(old[method](),node[method]()))throw Error('Changed rest '+method+': '+old.getName());
 q.fromArray(old.getRotation()).normalize();r.fromArray(node.getRotation()).normalize();if(q.angleTo(r)>3e-4)throw Error('Changed rest rotation: '+old.getName());
 const ai=oldJoints.indexOf(old),bi=newJoints.indexOf(node), am=oldSkin.getInverseBindMatrices().getElement(ai,[]),bm=newSkin.getInverseBindMatrices().getElement(bi,[]);
 if(!near(am,bm))throw Error('Changed inverse bind: '+old.getName());
}
const morphNames=mesh=>mesh?.getExtras()?.targetNames || [];
function targetNode(old){
 if(oldJoints.includes(old))return newJointMap.get(old.getName());
 if(old.getMesh()){
  const keys=morphNames(old.getMesh());
  const matches=newNodes.filter(node=>node.getMesh() && JSON.stringify(morphNames(node.getMesh()))===JSON.stringify(keys));
  if(matches.length!==1)throw Error('Cannot uniquely match original morph mesh '+old.getName());
  if(!near(old.getWorldMatrix(),matches[0].getWorldMatrix()))throw Error('Morph mesh world transform changed');
  return matches[0];
 }
 const matches=newNodes.filter(n=>n.getName()===old.getName());if(matches.length!==1)throw Error('Cannot uniquely map '+old.getName());return matches[0];
}
for(const name of names){if(a.listAnimations().filter(x=>x.getName()===name).length!==1||b.listAnimations().filter(x=>x.getName()===name).length!==1)throw Error('Missing or duplicate clip '+name);}
const buffer=b.listBuffers()[0]||candidate.createBuffer();
const accessors=new Map();
function copyAccessor(source){if(accessors.has(source))return accessors.get(source);const array=source.getArray();if(!array)throw Error('Missing sampler data');const dest=candidate.createAccessor(source.getName()).setType(source.getType()).setNormalized(source.getNormalized()).setArray(array.slice()).setBuffer(buffer);accessors.set(source,dest);return dest;}
for(const name of names){
 b.listAnimations().find(x=>x.getName()===name).dispose();
 const source=a.listAnimations().find(x=>x.getName()===name), dest=candidate.createAnimation(name), samplers=new Map();
 for(const old of source.listChannels()){
  const sampler=old.getSampler();let copied=samplers.get(sampler);
  if(!copied){copied=candidate.createAnimationSampler().setInterpolation(sampler.getInterpolation()).setInput(copyAccessor(sampler.getInput())).setOutput(copyAccessor(sampler.getOutput()));dest.addSampler(copied);samplers.set(sampler,copied);}
  dest.addChannel(candidate.createAnimationChannel().setTargetNode(targetNode(old.getTargetNode())).setTargetPath(old.getTargetPath()).setSampler(copied));
 }
}
await io.write(outPath,candidate);
console.log('Restored original animation keyframes and timing:',names.join(', '));
console.log('Original bone rest hierarchy and inverse binds checked; visual shape, materials, four-influence rendering, jaw motion and website fur still require independent review.');
