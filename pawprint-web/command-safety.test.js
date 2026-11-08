import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCommand,explainCommand} from './src/commands.js';
test('offline fallback abstains on negation, narratives, quotes and substring collisions',()=>{
 for(const text of ["Don't run","don't stop",'I watched a dog run yesterday','Welcome home','runway','stopwatch','我喜欢跳舞','不要停止','他说“过来”',null,undefined])assert.equal(parseCommand(text),null,String(text));
 assert.equal(explainCommand('Do not run').reason,'negated');
 for(const text of ["Don't run and jump",'Do not walk and run','If I say go, run','My favorite commands are walk, run, jump','Translate these words: walk, run, jump',"Run, don't run"])assert.equal(parseCommand(text),null,text);
});
test('supported commands honor latest instruction and explicit stop',()=>{
 assert.equal(parseCommand('Walk then run'),'run');
 assert.equal(parseCommand('run then walk'),'walk');
 assert.equal(parseCommand('Run and stop'),'stop');
 assert.equal(parseCommand('Could you please come over?'),'come');
 assert.equal(parseCommand('藍老，搖尾巴'),'wag');
 assert.equal(parseCommand('Viens ici'),'come');
 assert.equal(parseCommand('蓝老，不要动'),'stop');
 assert.equal(parseCommand('蓝老，别动吧'),'stop');
});
