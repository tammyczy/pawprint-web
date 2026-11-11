import 'dotenv/config';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {startGenerationQueue,stopServerAndQueue} from './generation-queue.mjs';
import {makeApp} from './app.mjs';
import {createCompanionAI} from './companion-ai.mjs';
import {createCompanionSpeech} from './companion-speech.mjs';
import {createMemoryDraft} from './memory-draft.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const port=Number(process.env.PORT||8788),origin=process.env.APP_ORIGIN||`http://127.0.0.1:${port}`;
const allowedOrigins=[origin];if(new URL(origin).hostname==='127.0.0.1')allowedOrigins.push('http://127.0.0.1:5174');
const companionAI=process.env.OPENAI_API_KEY?createCompanionAI({apiKey:process.env.OPENAI_API_KEY,model:process.env.OPENAI_MODEL||'gpt-5.4-mini'}):null;
const memoryDraft=process.env.OPENAI_API_KEY?createMemoryDraft({apiKey:process.env.OPENAI_API_KEY,model:process.env.OPENAI_MODEL||'gpt-5.4-mini'}):null;
const companionSpeech=process.env.OPENAI_API_KEY?createCompanionSpeech({apiKey:process.env.OPENAI_API_KEY,model:process.env.OPENAI_SPEECH_MODEL||'gpt-4o-mini-tts'}):null;
const cloud=process.env.CLOUD_DEPLOYMENT==='true';
const registrationCode=process.env.REGISTRATION_CODE||'';
const allowRegistration=process.env.ALLOW_REGISTRATION!=='false';
const dataDir=cloud?process.env.RAILWAY_VOLUME_MOUNT_PATH||process.env.DATA_DIR:path.join(root,'.data');
if(cloud&&(!dataDir||!path.isAbsolute(dataDir)||!origin.startsWith('https://')||process.env.LOCAL_TEST_MODE!=='false'||allowRegistration&&registrationCode.length<24))throw new Error('Cloud deployment requires a persistent data directory, HTTPS origin, account mode, and an invitation code for registration.');
const keyConfigured=!!process.env.TRIPO_API_KEY;
const automaticGeneration=cloud&&keyConfigured&&process.env.ALLOW_PAID_GENERATION==='true';
const {app,db}=await makeApp({dataDir,distDir:cloud?null:path.join(root,'dist'),origin,allowedOrigins,allowRegistration,keyConfigured,localMode:process.env.LOCAL_TEST_MODE!=='false',companionAI,companionSpeech,memoryDraft,cloud,registrationCode,automaticGeneration});
const server=app.listen(port,cloud?'0.0.0.0':'127.0.0.1');
let stopQueue=async()=>{};
let shuttingDown;
function shutdown(exitCode=0){
 if(shuttingDown)return shuttingDown;
 shuttingDown=stopServerAndQueue({server,stopQueue,db})
  .catch(error=>{console.error(`服务关闭失败：${error.message}`);process.exitCode=1;})
  .finally(()=>{if(exitCode)process.exitCode=exitCode;});
 return shuttingDown;
}
server.once('listening',()=>{
 console.log(`Pawprint API listening on port ${port}`);
 if(automaticGeneration){
  try{stopQueue=startGenerationQueue({db,dataDir});}
  catch(error){
   console.error(`生成队列启动失败：${error.message}`);
   void shutdown(1);
  }
 }
});
server.once('error',error=>{
 console.error(error.code==='EADDRINUSE'?`端口 ${port} 已被占用。请检查现有服务的 /api/health；无响应时先重启旧服务。`:`服务启动失败：${error.message}`);
 db.close();process.exitCode=1;
});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{void shutdown();});
