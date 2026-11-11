import test from 'node:test';
import assert from 'node:assert/strict';
import {createAIChat} from './src/ai-chat.js';
import {createPetRequestGuard} from './src/pet-request-guard.js';
import {respond} from './src/companion.js';

test('a stop supersedes an in-flight response and the next chat excludes its stale history',async()=>{
 let complete;
 const requests=[];
 const chat=createAIChat(null,{fetchImpl:async(_url,options)=>{
  requests.push(JSON.parse(options.body));
  if(requests.length===1)return new Promise(resolve=>{complete=resolve;});
  return Response.json({caption:'Ready',action:null,sound:null});
 }});
 const guard=createPetRequestGuard();
 const isCurrent=guard.begin();
 let shown='thinking',action='stop';
 const pending=chat('Run over here',isCurrent).then(answer=>{if(isCurrent()){shown=answer.caption;action=answer.action;}});
 // Simulate a deliberate stop while the provider is still processing.
 guard.invalidate();shown='Stopped';action='stop';
 complete(Response.json({caption:'Running!',action:'run',sound:null}));
 await pending;
 assert.equal(shown,'Stopped');
 assert.equal(action,'stop');
 const nextCurrent=guard.begin();
 await chat('Hello again',nextCurrent);
 assert.deepEqual(requests[1].history,[]);
});

test('a later explicit action also suppresses a stale failed request',async()=>{
 const guard=createPetRequestGuard();let fail;
 const isCurrent=guard.begin();let shown='thinking';
 const pending=new Promise((_,reject)=>{fail=reject;}).catch(()=>{if(isCurrent())shown='fallback';});
 guard.invalidate();shown='Stopped';fail(new Error('Unavailable'));
 await pending;
 assert.equal(shown,'Stopped');
});

test('a later explicit action prevents a pending farewell motion from overriding it',()=>{
 const guard=createPetRequestGuard();
 const farewellIsCurrent=guard.begin();
 let action='wag';
 guard.invalidate();action='walk';
 // Equivalent to the deferred return-home callback after the delay.
 if(farewellIsCurrent())action='home';
 assert.equal(action,'walk');
});

test('action button replies follow the interface language while typed input still follows the user',()=>{
 assert.equal(respond('stop','zh','蓝老','dog',{useInterfaceLanguage:true}).caption,'好，我乖乖陪着你。');
 assert.equal(respond('stop','fr','蓝老','dog',{useInterfaceLanguage:true}).caption,'Je reste près de toi.');
 assert.equal(respond('stop','zh').caption,'I’ll rest right beside you.');
});
