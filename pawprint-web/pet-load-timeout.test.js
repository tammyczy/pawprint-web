import test from 'node:test';
import assert from 'node:assert/strict';
import {loadWithIdleTimeout} from './src/pet-load-timeout.js';

test('model load completes and forwards progress without aborting',async()=>{
 let cancelled=0,progress=0;
 const value=await loadWithIdleTimeout({timeoutMs:100,onProgress:()=>progress++,start:(resolve,onProgress)=>{
  onProgress({loaded:20,total:100});resolve('model');return ()=>cancelled++;
 }});
 assert.equal(value,'model');assert.equal(progress,1);assert.equal(cancelled,0);
});

test('new progress extends the idle limit; repeated byte counts do not',async()=>{
 const scheduled=new Map();let next=0,onLoad,onProgress;
 const result=loadWithIdleTimeout({setTimer:fn=>{const id=++next;scheduled.set(id,fn);return id;},clearTimer:id=>scheduled.delete(id),start:(resolve,progress)=>{onLoad=resolve;onProgress=progress;}});
 assert.equal(scheduled.size,1);const first=[...scheduled.keys()][0];
 onProgress({loaded:1});assert.equal(scheduled.size,1);assert.ok(!scheduled.has(first));
 const second=[...scheduled.keys()][0];onProgress({loaded:1});assert.ok(scheduled.has(second));
 onLoad('model');assert.equal(await result,'model');assert.equal(scheduled.size,0);
});

test('stalled load aborts, rejects once and ignores late success and progress',async()=>{
 let onLoad,onProgress,cancelled=0,progress=0;
 const result=loadWithIdleTimeout({timeoutMs:10,onProgress:()=>progress++,start:(resolve,progressCallback)=>{
  onLoad=resolve;onProgress=progressCallback;return ()=>cancelled++;
 }});
 await assert.rejects(result,error=>error.code==='MODEL_LOAD_STALLED');
 onLoad('late model');onProgress({loaded:1});
 assert.equal(cancelled,1);assert.equal(progress,0);
});

test('loader failures retain their original cause and do not start a late timer',async()=>{
 const failure=new Error('bad glb');let cancelled=0;
 await assert.rejects(loadWithIdleTimeout({timeoutMs:10,start:(_resolve,_progress,reject)=>{
  reject(failure);return ()=>cancelled++;
 }}),error=>error===failure);
 await new Promise(resolve=>setTimeout(resolve,20));assert.equal(cancelled,0);
});
