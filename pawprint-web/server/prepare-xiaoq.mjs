import {mkdir,copyFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {openStore} from './store.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const db=openStore(path.join(root,'.data'));
const existing=db.prepare("SELECT id,status FROM jobs WHERE name='小Q' AND status!='DELETED'").get();
if(existing){console.log(JSON.stringify(existing));db.close();process.exit(0);}
const id=randomUUID(),now=Date.now(),dir=path.join(root,'.data','assets',id);await mkdir(dir,{recursive:true});
await copyFile('C:/Users/wjx52/AppData/Local/Temp/codex-clipboard-1615fc86-969f-4ec7-b264-432bf0ff30a3.png',path.join(dir,'front.png'));
await copyFile('C:/Users/wjx52/AppData/Local/Temp/codex-clipboard-a4e51eb7-ae6f-4f66-96cc-56decf6f7fd0.png',path.join(dir,'body-reference.png'));
db.prepare('INSERT OR IGNORE INTO users(id,email,password,created) VALUES(?,?,?,?)').run('local-workspace','local-workspace@lanlao.invalid','disabled',now);
const data={photos:{front:'front.png'},referencePhotos:{body:'body-reference.png'},mode:'generated_views',consentAt:now,referenceNotes:'第一张作为生成输入；第二张仅作体型尾巴人工核对，不伪装为同姿势侧视图。腿部与隐藏细节为推测，四视角待用户验收。'};
db.prepare('INSERT INTO jobs(id,user_id,name,status,data,message,created,updated) VALUES(?,?,?,?,?,?,?,?)').run(id,'local-workspace','小Q','WAITING_APPROVAL',JSON.stringify(data),'小Q试制：保留原始两张参考照片，先生成四视角检查毛色与体型。',now,now);
console.log(JSON.stringify({id,status:'WAITING_APPROVAL'}));db.close();
