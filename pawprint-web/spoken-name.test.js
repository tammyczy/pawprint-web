import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSpokenName} from './src/spoken-name.js';
import {directPetCommand} from './src/direct-pet-command.js';
import {isImmediateStop} from './src/immediate-stop.js';
import {requestedAction} from './server/action-guard.mjs';

test('misheard spellings of the name are restored before a command',()=>{
 for(const heard of ['Lan Lao come here','lan lao, come here','Land low come here','lanlow come here','Lan Lau come here','Hey Lan Lao come here','Len Lao come here'])
  assert.equal(directPetCommand(normalizeSpokenName(heard)),'come',heard);
 for(const heard of ['兰老过来','懒老，过来','蓝佬 过来'])assert.equal(requestedAction(normalizeSpokenName(heard),'Lanlao'),'come',heard);
 assert.equal(isImmediateStop(normalizeSpokenName('Lan Lao stop')),true);
 assert.equal(directPetCommand(normalizeSpokenName('Lan Lao run')),'run');
});
test('the rest of the sentence, including negation, is unchanged',()=>{
 assert.equal(normalizeSpokenName("Lan Lao don't run"),"Lanlao, don't run");
 assert.equal(requestedAction(normalizeSpokenName("Lan Lao don't run and jump"),'Lanlao')==='jump',false);
 assert.equal(directPetCommand(normalizeSpokenName("Lan Lao don't come here")),null);
});
test('ordinary sentences and correct names pass through',()=>{
 for(const text of ['come here','Lanlao, come here','蓝老，过来','I landed late last night','Long ago I had a dog','London is far','Please run','男老师说过来','懒老公不想动','兰老师让我跑'])
  assert.equal(normalizeSpokenName(text),text,text);
 assert.equal(normalizeSpokenName(null),null);
});
