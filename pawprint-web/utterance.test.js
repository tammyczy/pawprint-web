import test from 'node:test';
import assert from 'node:assert/strict';
import {createUtterance} from './src/recognition-status.js';

function setup(){const out=[],timers=[];let quiet=0;
 const u=createUtterance({commit:t=>out.push(t),onQuiet:()=>quiet++,setTimer:fn=>{timers.push(fn);return timers.length;},clearTimer:id=>{timers[id-1]=null;}});
 return {u,out,fire:()=>timers.splice(0).forEach(fn=>fn?.()),quiet:()=>quiet};}
test('a final result is committed once',()=>{const {u,out,fire}=setup();u.heard('come',false);u.heard('come here',true);fire();u.end();assert.deepEqual(out,['come here']);});
test('an interim result is committed when the session ends without a final one',()=>{const {u,out}=setup();u.heard('过来',false);assert.deepEqual(out,[]);u.end();u.end();assert.deepEqual(out,['过来']);});
test('an interim result is committed after a short silence',()=>{const {u,out,fire,quiet}=setup();u.heard('sit',false);u.heard('sit down',false);fire();assert.deepEqual(out,['sit down']);assert.equal(quiet(),1);u.heard('later',true);u.end();assert.deepEqual(out,['sit down']);});
test('nothing is committed for silence or a discarded session',()=>{const a=setup();a.u.end();assert.deepEqual(a.out,[]);const b=setup();b.u.heard('run',false);b.u.discard();b.fire();b.u.end();assert.deepEqual(b.out,[]);});
