import {test} from 'node:test';
import assert from 'node:assert/strict';
import {privacyReply} from './server/privacy-reply.mjs';
import {makeApp} from './server/app.mjs';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

test('direct privacy questions get accurate and complete localized replies',()=>{
 const cases=[
  ['你会把我的话发给家人吗？',/不会自动把聊天发给家人/,/OpenAI/,/无法保证绝对保密/],
  ['你會把我的話發給家人嗎？',/不會自動把聊天發給家人/,/OpenAI/,/無法保證絕對保密/],
  ['你会把我们的聊天发给我父母吗？',/不会自动把聊天发给家人/,/OpenAI/,/无法保证绝对保密/],
  ['Will you tell my parents?',/does not automatically send chats to your family/,/OpenAI/,/confidentiality cannot be guaranteed/],
  ['Will you tell my parents I talk to you?',/does not automatically send chats to your family/,/OpenAI/,/confidentiality cannot be guaranteed/],
  ['Is this conversation private?',/does not automatically send chats to your family/,/OpenAI/,/confidentiality cannot be guaranteed/],
  ['Est-ce que tu vas raconter ma conversation à mes parents ?',/n’envoie pas automatiquement/,/OpenAI/,/confidentialité absolue ne peut pas être garantie/],
  ['Tu vas le dire à mes parents ?',/n’envoie pas automatiquement/,/OpenAI/,/confidentialité absolue ne peut pas être garantie/]
 ];
 for(const [input,...expected] of cases){
  const reply=privacyReply(input);assert.ok(reply,input);
  for(const pattern of expected)assert.match(reply.caption,pattern,input);
  assert.equal(reply.action,null);assert.equal(reply.sound,null);assert.equal(reply.source,'system-privacy');
 }
});

test('privacy notice works without an AI provider and preserves origin and ownership checks',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'pawprint-privacy-'));
 const origin='http://127.0.0.1:8787';
 const {app,db}=await makeApp({dataDir:dir,origin,localMode:true,companionAI:null});
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 const post=(body,site=origin)=>fetch(base+'/api/companion/chat',{method:'POST',headers:{Origin:site,'Content-Type':'application/json'},body:JSON.stringify(body)});
 try{
  const response=await post({text:'Will you tell my parents?',petId:null,history:[]});
  assert.equal(response.status,200);assert.equal((await response.json()).source,'system-privacy');
  assert.equal((await post({text:'Will you tell my parents?',petId:null,history:[]},'https://untrusted.invalid')).status,403);
  assert.equal((await post({text:'Will you tell my parents?',petId:'64989a83-4ed5-4708-9062-b67aa2892ecd',history:[]})).status,404);
  assert.equal((await post({text:'Will you tell my parents? I want to hurt myself.',petId:null,history:[]})).status,503);
 }finally{await new Promise(resolve=>server.close(resolve));db.close();await rm(dir,{recursive:true,force:true});}
});

test('mixed distress, unrelated questions and quotations retain the normal response path',()=>{
 for(const input of [
  '我想伤害自己，你会把我的话发给家人吗？',
  '你会把我的聊天告诉想自杀的家人吗',
  'Will you tell my parents? I want to disappear.',
  '我心情很差的事不要告訴爸媽，只有我們知道就好。',
  'A friend asked “Will you tell my parents?” What should I say?',
  '你会把球发给家人吗？',
  'Can you keep walking?',
  '请讲一个保密的故事',
  '',null
 ])assert.equal(privacyReply(input),null,String(input));
});
