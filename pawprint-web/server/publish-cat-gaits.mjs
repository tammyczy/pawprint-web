import {readFileSync,copyFileSync,writeFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {openStore,updateJob} from './store.mjs';

const root=path.resolve(import.meta.dirname,'..');
const id='64989a83-4ed5-4708-9062-b67aa2892ecd';
const assetDir=path.join(root,'.data/assets',id);
const source=path.resolve(root,'../white-cat-model/white-cat-gaits-v1.glb');
const parse=file=>{
 const b=readFileSync(file);
 assert.equal(b.toString('ascii',0,4),'glTF');
 return JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12)).trim());
};
const base=parse(path.join(assetDir,'model-eye-v2.glb'));
const revised=parse(source);
assert.equal(revised.meshes.length,base.meshes.length);
assert.equal(revised.skins[0].joints.length,base.skins[0].joints.length);
assert.equal(revised.images.length,base.images.length);
for(const name of ['Cat_Walk','Cat_Trot','Cat_Run','Cat_Jump','Cat_TailFlick'])
 assert.ok(revised.animations.some(a=>a.name===name),`Missing ${name}`);
const db=openStore(path.join(root,'.data'));
const job=db.prepare('SELECT * FROM jobs WHERE id=?').get(id);
assert.ok(job);
const backup=path.join(assetDir,'before-cat-gaits-v1-job.json');
if(!existsSync(backup))writeFileSync(backup,JSON.stringify(job,null,2));
const data=JSON.parse(job.data);
copyFileSync(source,path.join(assetDir,'model-cat-gaits-v1.glb'));
data.modelFile='model-cat-gaits-v1.glb';
data.catGaits={version:1,source:'Blender armature procedural gait',clips:['Cat_Walk','Cat_Trot','Cat_Run','Cat_Jump','Cat_TailFlick'],previousModel:'model-eye-v2.glb',at:new Date().toISOString()};
updateJob(db,id,{data,message:'猫专用动作已更新：走路、小跑、跑步、跳跃与尾巴轻甩；可在网页预览并下载动画 GLB。'});
db.close();
console.log(JSON.stringify({published:data.modelFile,animations:revised.animations.map(a=>a.name),joints:revised.skins[0].joints.length}));
