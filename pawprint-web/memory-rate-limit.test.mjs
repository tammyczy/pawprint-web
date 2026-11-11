import test from 'node:test';
import assert from 'node:assert/strict';
import {createMemoryRateLimit} from './server/memory-rate-limit.mjs';

test('memory rate limit separates accounts, expires attempts and cleans idle accounts',()=>{
 let current=0;
 const limiter=createMemoryRateLimit({now:()=>current,windowMs:60000,limit:2});
 assert.equal(limiter.take('a'),true);
 assert.equal(limiter.take('a'),true);
 assert.equal(limiter.take('a'),false);
 assert.equal(limiter.take('b'),true);
 assert.equal(limiter.size,2);
 current=60000;
 assert.equal(limiter.take('a'),true);
 assert.equal(limiter.size,1); // The old, inactive b entry was cleaned.
});
