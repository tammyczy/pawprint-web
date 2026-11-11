import test from 'node:test';
import assert from 'node:assert/strict';
import {createMemoryDraftClient} from './src/memory-draft.js';
import {createMemoryCard} from './src/memory-card.js';

const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const reply=sentences=>({ok:true,json:async()=>({sentences})});

test('draft client requires valid input, sends only an explicit request and rejects ungrounded sources',async()=>{
 let requests=0,body;
 const client=createMemoryDraftClient({fetchImpl:async(url,options)=>{requests++;assert.equal(url,'/api/memory/draft');body=JSON.parse(options.body);return reply([{text:'A remembered window.',source:'window'}]);}});
 assert.equal(requests,0);
 await assert.rejects(client.generate('  ','en'));
 assert.equal(requests,0);
 assert.deepEqual(await client.generate('The window was warm.','en'),[{text:'A remembered window.',source:'window'}]);
 assert.deepEqual(body,{memory:'The window was warm.',language:'en',consent:true});
 const bad=createMemoryDraftClient({fetchImpl:async()=>reply([{text:'invented',source:'not in original'}])});
 await assert.rejects(bad.generate('one original memory','en'),/invalid memory draft/);
});

test('a cancelled response is ignored even if a provider ignores the abort signal',async()=>{
 const pending=deferred();
 const client=createMemoryDraftClient({fetchImpl:()=>pending.promise});
 const first=client.generate('original','en');client.cancel();
 pending.resolve(reply([{text:'story',source:'original'}]));
 assert.equal(await first,null);
});

test('timeout stops waiting even when fetch or response parsing ignores abort',async()=>{
 for(const stall of ['fetch','body']){
  let rejectLate;
  const pending=new Promise((_,reject)=>{rejectLate=reject;});
  const client=createMemoryDraftClient({timeoutMs:5,fetchImpl:()=>stall==='fetch'?pending:Promise.resolve({ok:true,json:()=>pending})});
  await assert.rejects(client.generate('one memory','en'),/memory draft timed out/);
  // A late error must stay handled after the timeout has returned to the UI.
  rejectLate(new Error('late provider error'));
  await new Promise(resolve=>setImmediate(resolve));
 }
});

test('cancelling a stuck request completes without waiting for a provider that ignores abort',async()=>{
 const pending=deferred();
 const client=createMemoryDraftClient({fetchImpl:()=>pending.promise});
 const request=client.generate('one memory','en');
 client.cancel();
 assert.equal(await request,null);
 pending.resolve(reply([{text:'late',source:'one memory'}]));
});

class FakeElement{
 constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.listeners={};this.textContent='';this.value='';this.checked=false;this.disabled=false;this.hidden=false;this.open=false;this.className='';this.id='';}
 setAttribute(){}
 focus(){}
 append(...items){this.children.push(...items);}
 replaceChildren(...items){this.children=[...items];}
 addEventListener(name,fn){(this.listeners[name]??=[]).push(fn);}
 dispatch(name){return Promise.all((this.listeners[name]||[]).map(fn=>fn({target:this})));}
 querySelector(selector){
  const all=this.descendants();
  if(selector.startsWith('#'))return all.find(e=>e.id===selector.slice(1))||null;
  if(selector==='label')return all.find(e=>e.tagName==='LABEL')||null;
  if(selector==='.memory-row-label:not(label)')return all.find(e=>e.className==='memory-row-label'&&e.tagName!=='LABEL')||null;
  return null;
 }
 querySelectorAll(selector){return selector==='.memory-row'?this.children.filter(e=>e.className==='memory-row'):[];}
 descendants(){return this.children.flatMap(e=>[e,...e.descendants()]);}
}
class FakeContainer extends FakeElement{
 set innerHTML(_html){
  this.nodes=new Map();
  for(const selector of ['details','#memory-original','.memory-consent input','.memory-generate','.memory-cancel','.memory-raw','.memory-clear','.memory-result','.memory-rows','.memory-download','.memory-status','.memory-title','.memory-sub','.memory-intro','.memory-label','.memory-count','.memory-privacy','.memory-consent span','.memory-result h3','.memory-review','.memory-discard'])this.nodes.set(selector,new FakeElement());
 }
 querySelector(selector){return this.nodes.get(selector)||null;}
}

test('editing and restarting a request keeps the new request busy when the old reply arrives',async()=>{
 const previous=globalThis.document;globalThis.document={createElement:tag=>new FakeElement(tag),body:new FakeElement('body')};
 try{
  const first=deferred(),second=deferred(),requests=[];
  const container=new FakeContainer();
  createMemoryCard({container,locale:()=> 'en',fetchImpl:(_url,options)=>{requests.push(JSON.parse(options.body));return requests.length===1?first.promise:second.promise;}});
  const get=selector=>container.querySelector(selector),original=get('#memory-original'),consent=get('.memory-consent input');
  original.value='first memory';await original.dispatch('input');
  assert.equal(requests.length,0);assert.equal(get('.memory-generate').disabled,true);
  consent.checked=true;await consent.dispatch('change');const pendingFirst=get('.memory-generate').dispatch('click');
  assert.equal(requests.length,1);assert.equal(get('.memory-cancel').hidden,false);
  original.value='second memory';await original.dispatch('input');assert.equal(consent.checked,false);
  consent.checked=true;await consent.dispatch('change');const pendingSecond=get('.memory-generate').dispatch('click');
  assert.equal(requests.length,2);assert.equal(requests[1].memory,'second memory');
  first.resolve(reply([{text:'old response',source:'first memory'}]));await pendingFirst;
  assert.equal(get('.memory-generate').disabled,true);assert.equal(get('.memory-cancel').hidden,false);
  assert.equal(get('.memory-result').hidden,true);
  second.resolve(reply([{text:'new response',source:'second memory'}]));await pendingSecond;
  assert.equal(get('.memory-result').hidden,false);assert.equal(get('.memory-cancel').hidden,true);
  assert.equal(get('.memory-rows').querySelector('#memory-draft-0').value,'new response');
  original.value='third memory';await original.dispatch('input');
  assert.equal(get('.memory-result').hidden,false);assert.equal(consent.checked,false);
  assert.equal(get('.memory-rows').querySelector('#memory-draft-0').value,'new response');
  assert.match(get('.memory-review').textContent,/earlier text, not the current text/i);
 }finally{globalThis.document=previous;}
});

test('changing or clearing original text preserves the edited draft and labels its old source',async()=>{
 const previous=globalThis.document;globalThis.document={createElement:tag=>new FakeElement(tag),body:new FakeElement('body')};
 try{
  let requests=0,language='en';const container=new FakeContainer();
  const card=createMemoryCard({container,locale:()=>language,fetchImpl:async()=>{requests++;return reply([{text:'first draft',source:'earlier memory'}]);}});
  const get=selector=>container.querySelector(selector),original=get('#memory-original'),consent=get('.memory-consent input');
  original.value='earlier memory';await original.dispatch('input');consent.checked=true;await consent.dispatch('change');
  await get('.memory-generate').dispatch('click');
  const draft=get('.memory-rows').querySelector('#memory-draft-0');
  draft.value='my edited remembrance';await draft.dispatch('input');
  original.value='a different memory';await original.dispatch('input');
  assert.equal(consent.checked,false);
  assert.equal(get('.memory-result').hidden,false);
  assert.equal(draft.value,'my edited remembrance');
  assert.equal(get('.memory-download').disabled,false);
  assert.equal(get('.memory-generate').disabled,true);
  assert.match(get('.memory-result h3').textContent,/previous draft/i);
  assert.match(get('.memory-review').textContent,/earlier text, not the current text/i);
  const row=get('.memory-rows').querySelectorAll('.memory-row')[0];
  assert.match(row.querySelector('.memory-row-label:not(label)').textContent,/earlier original.*not the current text/i);
  assert.equal(row.descendants().find(el=>el.tagName==='BLOCKQUOTE').textContent,'earlier memory');
  draft.value='my revised remembrance';await draft.dispatch('input');
  assert.match(get('.memory-review').textContent,/earlier text, not the current text/i);
  assert.match(row.querySelector('.memory-row-label:not(label)').textContent,/not the current text/i);
  consent.checked=true;await consent.dispatch('change');await get('.memory-generate').dispatch('click');
  assert.equal(requests,1);
  // Clearing the current original also keeps the draft and its clearly marked old source.
  await get('.memory-clear').dispatch('click');
  assert.equal(original.value,'');assert.equal(consent.checked,false);
  assert.equal(get('.memory-result').hidden,false);
  assert.equal(draft.value,'my revised remembrance');assert.equal(get('.memory-download').disabled,false);
  assert.match(get('.memory-review').textContent,/changed or cleared/i);
  language='zh';card.render();
  assert.equal(draft.value,'my revised remembrance');
  assert.match(get('.memory-review').textContent,/不代表当前原文/);
  assert.match(row.querySelector('.memory-row-label:not(label)').textContent,/非当前原文/);
  language='fr';card.render();
  assert.match(get('.memory-review').textContent,/pas au texte actuel/);
  assert.match(row.querySelector('.memory-row-label:not(label)').textContent,/pas le texte actuel/);
  await get('.memory-discard').dispatch('click');
  assert.equal(get('.memory-result').hidden,true);
  assert.equal(get('.memory-rows').querySelector('#memory-draft-0'),null);
 }finally{globalThis.document=previous;}
});

test('an edited draft cannot be silently replaced by another generation',async()=>{
 const previous=globalThis.document;globalThis.document={createElement:tag=>new FakeElement(tag),body:new FakeElement('body')};
 try{
  let requests=0;
  const container=new FakeContainer();
  createMemoryCard({container,locale:()=> 'en',fetchImpl:async()=>{requests++;return reply([{text:'first draft',source:'a memory'}]);}});
  const get=selector=>container.querySelector(selector),original=get('#memory-original'),consent=get('.memory-consent input');
  original.value='a memory';await original.dispatch('input');consent.checked=true;await consent.dispatch('change');
  await get('.memory-generate').dispatch('click');
  const draft=get('.memory-rows').querySelector('#memory-draft-0');
  draft.value='my carefully edited words';await draft.dispatch('input');
  assert.equal(get('.memory-generate').disabled,true);
  // The event guard also protects against programmatic clicks while disabled.
  await get('.memory-generate').dispatch('click');
  assert.equal(requests,1);
  assert.equal(get('.memory-result').hidden,false);
  assert.equal(get('.memory-rows').querySelector('#memory-draft-0').value,'my carefully edited words');
  assert.equal(original.value,'a memory');
  assert.match(get('.memory-review').textContent,/download.*discard/i);
  await get('.memory-discard').dispatch('click');
  assert.equal(get('.memory-result').hidden,true);
  assert.equal(get('.memory-generate').disabled,false);
  await get('.memory-generate').dispatch('click');
  assert.equal(requests,2);
 }finally{globalThis.document=previous;}
});

test('failure, cancellation and timeout keep the user’s original words',async()=>{
 const previous=globalThis.document;globalThis.document={createElement:tag=>new FakeElement(tag),body:new FakeElement('body')};
 try{
  for(const mode of ['failure','cancel','timeout']){
   const pending=deferred(),container=new FakeContainer();
   createMemoryCard({container,locale:()=> 'en',requestTimeoutMs:5,fetchImpl:(_url,{signal})=>{
    if(mode==='failure')return Promise.resolve({ok:false});
    if(mode==='timeout')return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true}));
    return pending.promise;
   }});
   const get=selector=>container.querySelector(selector),original=get('#memory-original'),consent=get('.memory-consent input');
   original.value='words I want to keep';await original.dispatch('input');consent.checked=true;await consent.dispatch('change');
   const clicked=get('.memory-generate').dispatch('click');
   if(mode==='cancel'){
    await get('.memory-cancel').dispatch('click');
    pending.resolve(reply([{text:'old',source:'words I want to keep'}]));
   }
   await clicked;
   assert.equal(original.value,'words I want to keep',mode);
   assert.equal(get('.memory-result').hidden,true,mode);
   assert.equal(get('.memory-raw').disabled,false,mode);
   assert.match(get('.memory-status').textContent,mode==='cancel'?/Stopped waiting/:/unavailable/,mode);
  }
 }finally{globalThis.document=previous;}
});
