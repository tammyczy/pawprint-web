import {mkdir,copyFile,access} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {openStore} from './store.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),db=openStore(path.join(root,'.data'));
const name='银白折耳猫';
const existing=db.prepare("SELECT id,status FROM jobs WHERE name=? AND status!='DELETED'").get(name);
if(existing){console.log(JSON.stringify(existing));db.close();process.exit(0);}
const sources=['e36ecf54-a028-4ff0-9958-425a8c64fa18','e644a4c2-39d0-4cef-87d5-bdf4f508d948','d1f1861c-4942-4c7f-bf9c-59236cdbf055'].map(x=>'C:/Users/wjx52/AppData/Local/Temp/codex-clipboard-'+x+'.jpg');
const views=['front','left','back','right'],inputDir=path.join(root,'..','white-cat-four-views');
for(const file of [...sources,...views.map(v=>path.join(inputDir,v+'.png'))])await access(file);
const id=randomUUID(),now=Date.now(),dir=path.join(root,'.data','assets',id);await mkdir(dir,{recursive:true});
for(const view of views)await copyFile(path.join(inputDir,view+'.png'),path.join(dir,view+'.png'));
for(const [i,file]of sources.entries())await copyFile(file,path.join(dir,'reference-'+(i+1)+'.jpg'));
const data={photos:Object.fromEntries(views.map(v=>[v,v+'.png'])),referencePhotos:{original1:'reference-1.jpg',original2:'reference-2.jpg',original3:'reference-3.jpg'},mode:'multiview',consentAt:now,referenceNotes:'User authorized API generation from existing generated four views of same silver-white folded-ear cat. Original photos retained for visual QA; not training data. AI views are inferred, not calibrated. Keep mouth naturally closed, preserve silver shading, green eyes and pink nose; no claim geometry is guaranteed.'};
db.prepare('INSERT INTO jobs(id,user_id,name,status,data,message,created,updated) VALUES(?,?,?,?,?,?,?,?)').run(id,'local-workspace',name,'WAITING_APPROVAL',JSON.stringify(data),'已核对三张原照和四张生成参考图，准备彩色模型、四足绑定和行走。',now,now);
console.log(JSON.stringify({id,status:'WAITING_APPROVAL',photos:4,originals:3}));db.close();
