import {test} from 'node:test';
import assert from 'node:assert/strict';
import {directPetCommand} from './src/direct-pet-command.js';
test('direct commands execute without guessing from conversation',()=>{
 for(const [text,action] of [['Lanlao, run','run'],['come here','come'],['Please wag your tail','wag'],['lie down','lie'],['sit','sit']])assert.equal(directPetCommand(text),action,text);
 for(const text of ['do not run','I saw a dog run','run and jump','drop','when you run','stop talking'])assert.equal(directPetCommand(text),null,text);
});
