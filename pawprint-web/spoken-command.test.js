import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSpokenCommand} from './src/spoken-command.js';
import {directPetCommand} from './src/direct-pet-command.js';
import {isImmediateStop} from './src/immediate-stop.js';

const act=heard=>{const text=normalizeSpokenCommand(heard);return isImmediateStop(text)?'stop':directPetCommand(text);};
test('whole spoken commands move the pet without a network call',()=>{
 const cases={come:['过来','过来。','蓝老过来','兰老过来','来这里','快过来','come here Lanlao','Lan Lao, come here!','come on','请过来吧'],
  walk:['走','散步','走两步','go for a walk',"let's walk"],run:['跑','跑起来','快跑','跑一下吧','go run','Lanlao run'],
  jump:['跳','跳一下','跳起来','jump up'],wag:['摇尾巴','摇摇尾巴','wag your tail','shake your tail'],
  sit:['坐','坐下','蓝老坐下','坐好','sit down please','Lanlao sit'],lie:['趴下','趴','躺下','lie down'],
  stand:['站起来','起来','stand up','get up'],stop:['停','停下','停下来','别动','stop','Lanlao stop','stay']};
 for(const [action,heard] of Object.entries(cases))for(const text of heard)assert.equal(act(text),action,text);
});
test('anything that is not a whole command is passed on unchanged',()=>{
 for(const text of ["don't run",'不要跑','别跑','I saw a dog run','run and jump','我今天跑了很久','你喜欢跑吗','can you run','when you run','不要过来','他说过来','I miss you','stop talking about it'])
  assert.equal(normalizeSpokenCommand(text),text,text);
 assert.equal(normalizeSpokenCommand("Lan Lao don't run"),"Lanlao, don't run");
 assert.equal(normalizeSpokenCommand(undefined),undefined);
});
