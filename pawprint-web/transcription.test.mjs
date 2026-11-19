import test from 'node:test';
import assert from 'node:assert/strict';
import {createTranscription} from './server/transcription.mjs';

test('transcription sends audio and language hints without exposing the key',async()=>{
 let request;
 const transcribe=createTranscription({apiKey:'test-key',fetchImpl:async(url,options)=>{request={url,...options};return new Response(JSON.stringify({text:'Lanlao sit'}),{status:200,headers:{'Content-Type':'application/json'}});}});
 const text=await transcribe({bytes:Buffer.from([1,2,3]),mime:'audio/webm',language:'en',signal:new AbortController().signal});
 assert.equal(text,'Lanlao sit');assert.equal(request.url,'https://api.openai.com/v1/audio/transcriptions');
 assert.equal(request.body.get('model'),'gpt-transcribe');assert.equal(request.body.get('languages[]'),'en');assert.deepEqual(request.body.getAll('keywords[]'),['Lanlao','sit','walk','run','jump','come here','wag tail','stop']);
 assert.equal(request.body.get('file').size,3);
});
test('service errors are reported without returning provider details',async()=>{
 const transcribe=createTranscription({apiKey:'test-key',fetchImpl:async()=>new Response('private details',{status:401})});
 await assert.rejects(transcribe({bytes:Buffer.from([1]),mime:'audio/webm',language:'en',signal:new AbortController().signal}),/Speech transcription unavailable/);
});
