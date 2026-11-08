import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createCompanionSpeech,speechInstructions} from './server/companion-speech.mjs';
import {makeApp} from './server/app.mjs';
import {createSpeechPlayer} from './src/voice-player.js';

test('speech sends exact text and chosen voice; provider failures do not leak credentials',async()=>{
 let request;
 const speech=createCompanionSpeech({apiKey:'test-secret',fetchImpl:async(url,options)=>{request={url,options};return new Response(new Uint8Array([73,68,51]),{headers:{'content-type':'audio/mpeg'}});}});
 assert.deepEqual(await speech({text:'你好，我在这里陪你。',voice:'shimmer'}),Buffer.from([73,68,51]));
 const body=JSON.parse(request.options.body);assert.equal(body.voice,'shimmer');assert.equal(body.input,'你好，我在这里陪你。');assert.match(body.instructions,/普通话/);
 await assert.rejects(speech({text:'hi',voice:'invalid'}),e=>e.status===400);
 await assert.rejects(speech({text:'hi',tone:'invalid'}),e=>e.status===400);
 assert.match(speechInstructions('难过的时候就慢慢来。','marin'),/Tender reassurance/);
 assert.match(speechInstructions('你来啦！','marin','cheerful'),/playful energy/);
 assert.match(speechInstructions('主人，我来啦！','verse','cheerful'),/male puppy/);
 assert.doesNotMatch(speechInstructions('主人，我来啦！','verse','cheerful'),/feminine/);
 const failing=createCompanionSpeech({apiKey:'test-secret',fetchImpl:async()=>new Response('test-secret provider details',{status:401})});
 await assert.rejects(failing({text:'hi'}),e=>e.status===502&&!e.message.includes('test-secret'));
});

test('speech API enforces session, origin, supported voices, text size and request limit',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'pawprint-speech-')),origin='http://127.0.0.1:8788';
 let calls=0;
 const {app,db}=await makeApp({dataDir:dir,origin,companionSpeech:async({text,voice})=>{assert.equal(text,'你好');assert.equal(voice,'verse');calls++;return Buffer.from([73,68,51]);}});
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}`;
 const post=(route,body,cookie='',source=origin)=>fetch(base+'/api'+route,{method:'POST',headers:{Origin:source,'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(body)});
 try{
  assert.equal((await post('/companion/speech',{text:'你好'})).status,401);
  const registration=await post('/register',{email:'voice@example.test',password:'long-passphrase-123'});const cookie=registration.headers.get('set-cookie').split(';')[0];
  assert.equal((await post('/companion/speech',{text:'你好'},cookie,'https://foreign.test')).status,403);
  for(const body of [{text:''},{text:'x'.repeat(501)},{text:'你好',voice:'unknown'},{text:'你好',tone:'unknown'}])assert.equal((await post('/companion/speech',body,cookie)).status,400);
  const audio=await post('/companion/speech',{text:'你好'},cookie);assert.equal(audio.status,200);assert.match(audio.headers.get('content-type'),/audio\/mpeg/);assert.equal(audio.headers.get('cache-control'),'no-store');assert.deepEqual(new Uint8Array(await audio.arrayBuffer()),new Uint8Array([73,68,51]));
  for(let i=1;i<20;i++)assert.equal((await post('/companion/speech',{text:'你好'},cookie)).status,200);
  assert.equal((await post('/companion/speech',{text:'你好'},cookie)).status,429);assert.equal(calls,20);
 }finally{await new Promise(r=>server.close(r));db.close();await rm(dir,{recursive:true,force:true});}
});

const audioStub=()=>({src:'',paused:true,pause(){this.paused=true;},removeAttribute(){this.src='';},load(){},async play(){this.paused=false;}});
const audioResponse=()=>new Response(new Blob(['sample audio']),{headers:{'content-type':'audio/mpeg'}});
test('voice replay caches audio while switching voices makes a separate request',async()=>{
 let calls=0;const revoked=[],states=[],audio=audioStub();
 const player=createSpeechPlayer({audio,fetchImpl:async()=>{calls++;return audioResponse();},createURL:()=>`blob:${calls}`,revokeURL:url=>revoked.push(url),onState:s=>states.push(s)});
 assert.equal(await player.speak('hi','coral'),true);assert.equal(await player.speak('hi','coral'),true);assert.equal(calls,1);
 assert.equal(await player.speak('hi','shimmer'),true);assert.equal(calls,2);assert.equal(await player.speak('hi','shimmer','comfort'),true);assert.equal(calls,3);player.stop();assert.equal(audio.paused,true);assert.equal(audio.src,'');assert.equal(states.at(-1),'idle');assert.equal(revoked.length,4);
});
test('stopping an in-flight voice prevents a late response from playing',async()=>{
 let finish,signal;const audio=audioStub();let plays=0;audio.play=async()=>{plays++;};
 const player=createSpeechPlayer({audio,fetchImpl:async(url,options)=>{signal=options.signal;return new Promise(r=>finish=r);},createURL:()=> 'blob:late',revokeURL:()=>{}});
 const pending=player.speak('hi','coral');player.stop();assert.equal(signal.aborted,true);finish(audioResponse());assert.equal(await pending,false);assert.equal(plays,0);
});
test('autoplay denial remains replayable and does not regenerate the voice',async()=>{
 let calls=0,state;const audio=audioStub();audio.play=async()=>{throw Object.assign(new Error('click required'),{name:'NotAllowedError'});};
 const player=createSpeechPlayer({audio,fetchImpl:async()=>{calls++;return audioResponse();},createURL:()=> 'blob:sample',revokeURL:()=>{},onState:s=>state=s});
 assert.equal(await player.speak('hi','coral'),false);assert.equal(state,'blocked');audio.play=async()=>{};assert.equal(await player.speak('hi','coral'),true);assert.equal(calls,1);
});
