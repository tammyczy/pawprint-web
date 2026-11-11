import test from 'node:test';
import assert from 'node:assert/strict';
import {createLanlaoViewerFailure,guardLanlaoInput} from './src/lanlao-viewer-failure.js';

function element(tag){return {tag,textContent:'',children:[],classList:{remove(value){this.removed=value;}},setAttribute(name,value){this[name]=value;},replaceChildren(...children){this.children=children;}};}
test('failure overlay translates and offers an explicit reload without modifying other page content',()=>{
 const loading=element('div'),state=element('span'),memory=element('textarea');memory.textContent='a memory';
 let language='en',reloaded=0;
 const failure=createLanlaoViewerFailure({loading,state,locale:()=>language,reload:()=>reloaded++,document:{createElement:element}});
 failure.show('model');
 assert.match(loading.children[0].textContent,/connection|reload/i);assert.doesNotMatch(loading.children[0].textContent,/models\//);
 assert.match(loading.children[1].textContent,/downloaded/i);
 assert.equal(loading.role,'alert');assert.equal(loading.children[2].type,'button');
 assert.equal(memory.textContent,'a memory');assert.equal(reloaded,0);
 language='zh';failure.render();assert.match(loading.children[0].textContent,/网络/);assert.match(loading.children[1].textContent,/下载/);assert.equal(loading.children[2].textContent,'重新加载页面');
 language='fr';failure.render();assert.match(loading.children[0].textContent,/connexion/);assert.match(loading.children[2].textContent,/Actualiser/);loading.children[2].onclick();assert.equal(reloaded,1);
 failure.show('timeout');assert.match(loading.children[0].textContent,/progresse/);
 for(const code of ['model','animation'])for(const value of ['zh','en','fr']){language=value;failure.show(code);assert.doesNotMatch(loading.children[0].textContent,/models\//);assert.ok(loading.children[1].textContent);}
});

test('a late final speech result cannot trigger a request, movement, or speech after context loss',()=>{
 let ready=true,contextLost=false;const effects=[];
 const accept=guardLanlaoInput({isAvailable:()=>ready&&!contextLost,handle:text=>{effects.push(['request',text],['movement',text],['speech',text]);}});
 const finalResult=text=>accept(text);
 finalResult('hello');assert.deepEqual(effects.map(([kind])=>kind),['request','movement','speech']);
 effects.length=0;contextLost=true;ready=false;
 finalResult('late result');assert.deepEqual(effects,[]);
 ready=true;finalResult('late after attempted restoration');assert.deepEqual(effects,[]);
});
