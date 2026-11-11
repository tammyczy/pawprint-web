import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {companionInstructions,createCompanionAI} from './server/companion-ai.mjs';
import {initI18n,tr} from './src/i18n.js';

test('chat instructions preserve a warm character while setting identity and memory boundaries',async()=>{
 for(const language of ['Simplified Chinese','English','French']){
  const prompt=companionInstructions({name:'Lanlao',kind:'dog',language});
  assert.match(prompt,/warmly and playfully/);
  assert.match(prompt,/not the actual animal, its consciousness, its spirit, or a resurrected pet/);
  assert.match(prompt,/or if the user seems to believe you are/);
  assert.match(prompt,/Do not repeat this explanation in every ordinary exchange/);
  assert.match(prompt,/never invent real-life events or memories/i);
  assert.match(prompt,/something the user shared/);
  assert.match(prompt,/Never forgive, absolve or judge/);
  assert.match(prompt,/Do not ask the user to return/);
  assert.doesNotMatch(prompt,/Speak as the user's own pet/);
 }
 let body;
 const chat=createCompanionAI({apiKey:'test',fetchImpl:async(_url,options)=>{
  body=JSON.parse(options.body);
  return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({caption:'一起玩吧！',action:'wag',sound:'none'})}]}]});
 }});
 assert.deepEqual(await chat({name:'蓝老',kind:'dog',text:'来一起玩'}),{caption:'一起玩吧！',action:'wag',sound:null});
 assert.match(body.instructions,/simulated AI companion/);
 assert.match(body.instructions,/Never forgive, absolve or judge/);
});

test('simulation notice remains visible in the chat and follows language changes',async()=>{
 const app=await readFile(new URL('./app.html',import.meta.url),'utf8');
 const pet=await readFile(new URL('./pet.html',import.meta.url),'utf8');
 assert.match(app,/<p class="chat-sim-note" data-i18n="simNote"[^>]*>[^<]+<\/p>\s*<form id="command-form">/);
 assert.match(pet,/<p class="sim-note" data-i18n="simNote"[^>]*>[^<]+<\/p>/);
 const previous={document:globalThis.document,localStorage:globalThis.localStorage,location:globalThis.location,Node:globalThis.Node};
 const notice=()=>({dataset:{i18n:'simNote'},textContent:'',querySelector:()=>null});
 const notes=[notice(),notice()];
 const element=()=>({dataset:{},setAttribute(){},append(){},querySelector(){return null;}});
 const store=new Map();
 globalThis.localStorage={getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value)};
 globalThis.location={search:'?lang=en'};globalThis.Node={TEXT_NODE:3};
 globalThis.document={documentElement:{},title:'',createElement:element,querySelector:()=>null,querySelectorAll:selector=>selector==='[data-i18n]'?notes:[]};
 try{
  const {select}=initI18n('home');
  for(const [lang,part] of [['en','AI simulation'],['zh','AI 模拟互动'],['fr','Simulation IA']]){
   select.value=lang;select.onchange();
   for(const note of notes)assert.ok(note.textContent.includes(part));
   assert.equal(notes[0].textContent,tr('simNote'));
   assert.doesNotMatch(tr('petIntro'),/心里的话，悄悄写|My thoughts|Mes pensées/);
  }
 }finally{
  for(const [key,value] of Object.entries(previous))if(value===undefined)delete globalThis[key];else globalThis[key]=value;
 }
});
