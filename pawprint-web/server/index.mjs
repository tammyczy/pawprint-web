import 'dotenv/config';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {makeApp} from './app.mjs';
import {createCompanionAI} from './companion-ai.mjs';
import {createCompanionSpeech} from './companion-speech.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const port=Number(process.env.PORT||8788),origin=process.env.APP_ORIGIN||`http://127.0.0.1:${port}`;
const allowedOrigins=[origin];if(new URL(origin).hostname==='127.0.0.1')allowedOrigins.push('http://127.0.0.1:5174');
const companionAI=process.env.OPENAI_API_KEY?createCompanionAI({apiKey:process.env.OPENAI_API_KEY,model:process.env.OPENAI_MODEL||'gpt-5.4-mini'}):null;
const companionSpeech=process.env.OPENAI_API_KEY?createCompanionSpeech({apiKey:process.env.OPENAI_API_KEY,model:process.env.OPENAI_SPEECH_MODEL||'gpt-4o-mini-tts'}):null;
const {app,db}=await makeApp({dataDir:path.join(root,'.data'),distDir:path.join(root,'dist'),origin,allowedOrigins,allowRegistration:process.env.ALLOW_REGISTRATION!=='false',keyConfigured:!!process.env.TRIPO_API_KEY,localMode:process.env.LOCAL_TEST_MODE!=='false',companionAI,companionSpeech});
const server=app.listen(port,'127.0.0.1');
server.once('listening',()=>console.log(`蓝老本机服务: http://127.0.0.1:${port} · 外网访问尚未开放`));
server.once('error',error=>{
 console.error(error.code==='EADDRINUSE'?`端口 ${port} 已被占用。请检查现有服务的 /api/health；无响应时先重启旧服务。`:`服务启动失败：${error.message}`);
 db.close();process.exitCode=1;
});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>{db.close();process.exit(0);}));
