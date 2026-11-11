import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bindRecognitionErrors,createRecognitionWatchdog,recognitionStatus} from './src/recognition-status.js';

test('simulated recognition errors distinguish permissions, microphone, network and silence in all interface languages',()=>{
 const checks={
  en:{'not-allowed':/permission/i,'audio-capture':/microphone/i,network:/connect/i,'no-speech':/no speech/i},
  zh:{'not-allowed':/权限/,'audio-capture':/麦克风/,network:/网络/,'no-speech':/没有检测到语音/},
  fr:{'not-allowed':/autorisé/i,'audio-capture':/microphone/i,network:/connect/i,'no-speech':/parole/i}
 };
 for(const [language,cases] of Object.entries(checks)){
  const recognition={};let seen;
  bindRecognitionErrors(recognition,{locale:()=>language,onError:(code,message)=>{seen={code,message};}});
  for(const [code,pattern] of Object.entries(cases)){
   recognition.onerror({error:code});assert.equal(seen.code,code);assert.match(seen.message,pattern);
  }
 }
});

test('recognition errors use current language and unknown errors have safe fallback',()=>{
 let language='en',seen;const recognition={};
 bindRecognitionErrors(recognition,{locale:()=>language,onError:(code,message)=>{seen=message;}});
 recognition.onerror({error:'network'});assert.match(seen,/connect/i);
 language='zh';recognition.onerror({error:'network'});assert.match(seen,/网络/);
 recognition.onerror({error:'unexpected'});assert.equal(seen,recognitionStatus('unknown','zh'));
});

test('a silent recognition session expires, stops listening and cannot process a late result',()=>{
 let callback,aborts=0,resets=0,accepted=0;
 const recognition={abort(){aborts++;}};
 const watchdog=createRecognitionWatchdog(recognition,{onTimeout:()=>resets++,setTimer:(fn,ms)=>{assert.equal(ms,20000);callback=fn;return 1;},clearTimer:()=>{}});
 const onResult=()=>{if(!watchdog.expired)accepted++;};
 watchdog.start();callback();onResult();
 assert.equal(watchdog.expired,true);assert.equal(aborts,1);assert.equal(resets,1);assert.equal(accepted,0);
});

test('completed recognition cancels the deadline without aborting',()=>{
 let cleared,aborts=0,resets=0;
 const watchdog=createRecognitionWatchdog({abort(){aborts++;}},{onTimeout:()=>resets++,setTimer:()=>42,clearTimer:id=>{cleared=id;}});
 watchdog.start();watchdog.cancel();
 assert.equal(cleared,42);assert.equal(aborts,0);assert.equal(resets,0);assert.equal(watchdog.expired,false);
});
