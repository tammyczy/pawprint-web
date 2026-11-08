import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {featurize,predictIntent,hybridCommand,INTENT_LABELS} from './src/intent-model.js';
import {explainCommand} from './src/commands.js';
import {trainModel,findOverlaps} from './eval/intent/trainer.mjs';

const load=path=>JSON.parse(readFileSync(new URL(path,import.meta.url)));
const {items:train}=load('./eval/intent/train.json');
const cases=load('./eval/cases.json');
const model=load('./eval/intent/model.json');

test('featurization: NFKC, lowercase, boundary-marked char 1-3 grams, Han runs, symbols',()=>{
 const f=featurize('Run!');
 for(const x of ['w:run','c:_r','c:ru','c:run','c:un_','c:n_','c:r','p:!'])assert.ok(f.includes(x),x);
 assert.ok(!f.includes('c:_'));
 assert.deepEqual(featurize('ＲＵＮ!').sort(),f.sort());
 const zh=featurize('跳一下');
 for(const x of ['w:跳一下','c:_跳','c:跳一下','c:下_','c:一'])assert.ok(zh.includes(x),x);
 assert.ok(featurize('小q跑').includes('w:q'));
 assert.ok(featurize('他说「跳」').includes('p:"'));
 assert.deepEqual(featurize(''),[]);
});

test('probabilities cover all 8 labels and sum to 1',()=>{
 assert.deepEqual(model.labels,INTENT_LABELS);
 for(const text of ['Come here','我好难过','Saute','','💤','a'.repeat(500)]){
  const p=predictIntent(model,text),values=Object.values(p.probs);
  assert.equal(values.length,8);
  assert.ok(Math.abs(values.reduce((a,b)=>a+b,0)-1)<1e-9,text);
  assert.equal(p.confidence,Math.max(...values));
  assert.equal(p.action,p.label==='none'?null:p.label);
 }
});

test('hybrid never overrides a negation or quoted command, even at threshold 0',()=>{
 const risky=["Don't run","Do not jump","Please never walk away",'不要跑步','不许跳','不用过来','別跑','Never jump on me',"Don't wag your tail",'She said “run”','他说「跳一下」','Translate "come here"'];
 for(const text of [...risky,...train.map(x=>x.text),...cases.map(x=>x.text)]){
  const reason=explainCommand(text).reason;
  if(reason!=='negated'&&reason!=='quoted-text')continue;
  assert.equal(hybridCommand(model,text,{threshold:0}).action,null,text);
 }
 for(const text of risky)assert.equal(hybridCommand(model,text,{threshold:0}).action,null,text);
});

test('hybrid keeps rule decisions and gates the classifier by threshold',()=>{
 assert.deepEqual([hybridCommand(model,'Run and stop').action,hybridCommand(model,'Run and stop').source],['stop','rules']);
 assert.equal(hybridCommand(model,'藍老，過來').action,'come');
 const text='Sprint around the kitchen please',guess=predictIntent(model,text);
 assert.equal(hybridCommand(model,text,{threshold:1.01}).action,null);
 assert.equal(hybridCommand(model,text,{threshold:0}).action,guess.action);
});

test('training is deterministic and model.json is reproducible from train.json',()=>{
 const small=train.slice(0,80);
 assert.deepEqual(trainModel(small,{epochs:5}),trainModel(small,{epochs:5}));
 assert.notDeepEqual(trainModel(small,{epochs:5,seed:1}).bias,trainModel(small,{epochs:5,seed:2}).bias);
 const again=trainModel(train,{threshold:model.threshold});
 assert.deepEqual(again.weights,model.weights);
 assert.deepEqual(again.bias,model.bias);
});

test('training data does not overlap the dev cases (exact or near), and the check works',()=>{
 assert.deepEqual(findOverlaps(train,cases),[]);
 assert.equal(new Set(train.map(x=>x.id)).size,train.length);
 assert.ok(train.every(x=>INTENT_LABELS.includes(x.label)&&x.source));
 const planted=findOverlaps([{id:'t1',text:'Lanlao, come here!'},{id:'t2',text:'Come heere'},{id:'t3',text:'Tell me a joke'}],[{id:'c1',text:'Come here'}]);
 assert.deepEqual(planted.map(x=>[x.trainId,x.kind]),[['t1','exact'],['t2','near']]);
});
