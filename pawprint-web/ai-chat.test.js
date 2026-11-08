import test from 'node:test';
import assert from 'node:assert/strict';
import {createAIChat} from './src/ai-chat.js';
import {createSpeechPlayer} from './src/voice-player.js';

const reply=(caption='Hello',action=null)=>Response.json({caption,action,sound:null});

test('chat sends the pet identity and retains only ten successful history entries',async()=>{
 const requests=[];
 const chat=createAIChat('pet-one',{fetchImpl:async(url,options)=>{requests.push(JSON.parse(options.body));return reply(`reply-${requests.length}`);}});
 for(let index=0;index<8;index++)await chat(`message-${index}`);
 assert.equal(requests[0].petId,'pet-one');
 assert.deepEqual(requests[0].history,[]);
 assert.equal(requests.at(-1).history.length,10);
 assert.deepEqual(requests.at(-1).history[0],{role:'user',content:'message-2'});
 assert.deepEqual(requests.at(-1).history.at(-1),{role:'assistant',content:'reply-7'});
});

test('malformed replies and HTTP errors do not enter conversation history',async()=>{
 const responses=[Response.json({caption:'bad',action:'unknown'}),Response.json({caption:{html:'bad'}}),reply(''),Response.json({error:'Unavailable'},{status:503}),new Response('<html>gateway error</html>'),reply('Recovered','walk')];
 const requests=[];
 const chat=createAIChat(null,{fetchImpl:async(url,options)=>{requests.push(JSON.parse(options.body));return responses.shift();}});
 for(let index=0;index<5;index++)await assert.rejects(chat('hello'));
 assert.deepEqual(await chat('hello'),{caption:'Recovered',action:'walk',sound:null});
 for(const request of requests)assert.deepEqual(request.history,[]);
});

test('a timed-out chat releases the request and the next message can succeed',async()=>{
 let calls=0,signal;
 const chat=createAIChat(null,{timeoutMs:10,fetchImpl:async(url,options)=>{
  if(++calls>1)return reply('Recovered');
  signal=options.signal;
  return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('Timed out','AbortError')),{once:true}));
 }});
 await assert.rejects(chat('hello'),{name:'AbortError'});
 assert.equal(signal.aborted,true);
 assert.equal((await chat('again')).caption,'Recovered');
});

test('voice timeout displays a recoverable error instead of staying in preparing state',async()=>{
 const states=[];
 const audio={pause(){},removeAttribute(){},load(){},async play(){assert.fail('Timed-out audio must not play');}};
 const player=createSpeechPlayer({audio,timeoutMs:10,onState:(state,message)=>states.push({state,message}),fetchImpl:async(url,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('Timed out','AbortError')),{once:true}))});
 assert.equal(await player.speak('hello','verse'),false);
 assert.equal(states.at(-1).state,'error');
 assert.match(states.at(-1).message,/too long/);
 player.stop();
 assert.equal(states.at(-1).state,'idle');
});
