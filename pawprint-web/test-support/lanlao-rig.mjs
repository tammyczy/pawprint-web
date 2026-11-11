import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
import {Bone,Group,Matrix4,Vector3} from 'three';

export async function loadLanlaoRig(path='public/models/lanlao-rig-motion-refined.glb'){
 await MeshoptDecoder.ready;
 const doc=await new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder})
  .read(path);
 const skin=doc.getRoot().listSkins()[0],nodes=skin.listJoints(),model=new Group(),actor=new Group();actor.add(model);
 const map=new Map(nodes.map(n=>{const b=new Bone();b.name=n.getName();b.position.fromArray(n.getTranslation());
  b.quaternion.fromArray(n.getRotation());b.scale.fromArray(n.getScale());return [n,b];}));
 for(const [node,bone] of map)for(const child of node.listChildren())if(map.has(child))bone.add(map.get(child));
 model.add(map.get(skin.getSkeleton()??nodes[0]));model.updateWorldMatrix(true,true);
 const bones=[...map.values()];
 const paws=['Front_L_Paw','Front_R_Paw','Hind_L_Paw','Hind_R_Paw'].map(n=>model.getObjectByName(n));
 const bind=bones.map(b=>({p:b.position.clone(),q:b.quaternion.clone(),s:b.scale.clone()}));
 const primitive=doc.getRoot().listMeshes()[0].listPrimitives()[0];
 const position=primitive.getAttribute('POSITION'),weight=primitive.getAttribute('WEIGHTS_0'),id=primitive.getAttribute('JOINTS_0');
 const inverse=nodes.map((_,i)=>new Matrix4().fromArray(skin.getInverseBindMatrices().getElement(i,[])));
 const indices=primitive.getIndices().getArray();
 const vertices=Array.from({length:position.getCount()},(_,i)=>{
  const ws=weight.getElement(i,[]),sum=ws.reduce((a,b)=>a+b,0);
  return {p:new Vector3().fromArray(position.getElement(i,[])),ids:id.getElement(i,[]),ws:ws.map(w=>sum?w/sum:0)};
 });
 function deformed(){
  model.updateWorldMatrix(true,true);
  const toModel=model.matrixWorld.clone().invert();
  const transforms=nodes.map((n,i)=>new Matrix4().multiplyMatrices(toModel,map.get(n).matrixWorld).multiply(inverse[i]));
  const values=new Float32Array(vertices.length*3),p=new Vector3(),v=new Vector3();
  vertices.forEach((o,i)=>{p.set(0,0,0);for(let j=0;j<4;j++)if(o.ws[j])p.addScaledVector(v.copy(o.p).applyMatrix4(transforms[o.ids[j]]),o.ws[j]);p.toArray(values,i*3);});
  return values;
 }
 return {doc,model,actor,bones,paws,bind,deformed,indices};
}
