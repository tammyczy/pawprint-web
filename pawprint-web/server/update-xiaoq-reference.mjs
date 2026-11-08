import {copyFile} from 'node:fs/promises';
import {openStore,updateJob} from './store.mjs';
const db=openStore('.data');const j=db.prepare("SELECT * FROM jobs WHERE id=?").get('43788e99-7894-4b2f-ae42-33757b37227a');
if(j.status!=='WAITING_APPROVAL'||JSON.parse(j.data).tokens)throw new Error('任务已开始，不能更换输入。');
await copyFile('C:/Users/wjx52/AppData/Local/Temp/codex-clipboard-2a05c585-5614-4fd2-89d7-899aa58e2f52.jpg',`.data/assets/${j.id}/primary.jpg`);
const data=JSON.parse(j.data);data.referencePhotos.face='front.png';data.photos={front:'primary.jpg'};data.referenceNotes='最新曝光正常的全身 JPG 为主要输入，前两张保留作人工对照。俯视照片看不到的腿部与腹部仍属于推测。';
updateJob(db,j.id,{data,message:'使用新提供的清晰全身照，准备生成四视角草稿。'});db.close();console.log('已更新主要参考图，尚未提交生成。');
