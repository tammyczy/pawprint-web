import {readFileSync,copyFileSync,writeFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {openStore,updateJob} from './store.mjs';

const root=path.resolve(import.meta.dirname,'..');
const id='64989a83-4ed5-4708-9062-b67aa2892ecd';
const assetDir=path.join(root,'.data/assets',id);
const source=path.resolve(root,'../white-cat-model/white-cat-pawlock-whiskers-v2.glb');
const destination='model-cat-pawlock-whiskers-v2.glb';
const parse=file=>{
  const b=readFileSync(file);
  assert.equal(b.toString('ascii',0,4),'glTF');
  return JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12)).trim());
};

const previous=parse(path.join(assetDir,'model-cat-gaits-v1.glb'));
const revised=parse(source);
assert.equal(revised.scenes.length,1);
assert.equal(revised.meshes.length,2);
assert.equal(revised.skins.length,1);
assert.equal(revised.skins[0].joints.length,previous.skins[0].joints.length);
assert.equal(revised.images.length,previous.images.length);
const whiskers=revised.nodes.find(n=>n.name==='Cat_Tapered_Whiskers');
assert.ok(whiskers && Number.isInteger(whiskers.mesh) && whiskers.skin===0);
const cat=revised.nodes.find(n=>n.name?.startsWith('tripo_node_'));
assert.ok(cat && Number.isInteger(cat.mesh) && cat.skin===0);
assert.ok(revised.materials.some(m=>m.pbrMetallicRoughness?.baseColorTexture));
const clips=['Cat_Walk','Cat_Trot','Cat_Run','Cat_Jump','Cat_TailFlick'];
for(const name of clips)assert.ok(revised.animations.some(a=>a.name===name),`Missing ${name}`);

const db=openStore(path.join(root,'.data'));
const job=db.prepare('SELECT * FROM jobs WHERE id=?').get(id);
assert.ok(job);
const data=JSON.parse(job.data);
assert.equal(data.modelFile,'model-cat-gaits-v1.glb');
const backup=path.join(assetDir,'before-cat-pawlock-whiskers-v2-job.json');
if(!existsSync(backup))writeFileSync(backup,JSON.stringify(job,null,2));
copyFileSync(source,path.join(assetDir,destination));
data.modelFile=destination;
data.catGaits={...data.catGaits,version:2,previousModel:'model-cat-gaits-v1.glb',clips,pawOrientationLocked:true,taperedSkinnedWhiskers:true,baseColorTexturePreserved:true,at:new Date().toISOString()};
updateJob(db,id,{data,message:'猫咪动作修订：跑步和跳跃脚掌保持朝向；胡须改为随头部移动的细锥形，保留原毛色贴图。'});
db.close();
console.log(JSON.stringify({published:destination,animations:revised.animations.map(a=>a.name),joints:revised.skins[0].joints.length,meshes:revised.meshes.map(m=>m.name),images:revised.images.length}));
