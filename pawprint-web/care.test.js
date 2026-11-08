import test from 'node:test';
import assert from 'node:assert/strict';
import {detectDistress,careText,careCopy,readFarewell,saveFarewell,farewellKey,createBreakTimer,HELPLINE_URL} from './src/care-core.js';

test('detects serious distress in English, Chinese and French', () => {
 for (const text of ['I want to die without you','i dont want to live anymore','Sometimes I think about killing myself','I keep hurting myself','我不想活了','我好想死','活不下去了','自殺','je veux mourir','J’ai plus envie de vivre, plus envie de vivre']) assert.equal(detectDistress(text), 'crisis', text);
});

test('does not flag ordinary grief or play', () => {
 for (const text of ['I miss you so much','我好想你','Lanlao, come here','You were the best dog','je suis triste','Let’s run!','the dog died last year','die Katze', '']) assert.equal(detectDistress(text), null, text);
});

test('copy exists for every key in every language and fills the pet name', () => {
 const keys = Object.keys(careCopy.en);
 for (const lang of ['zh','fr']) assert.deepEqual(Object.keys(careCopy[lang]).sort(), [...keys].sort(), lang);
 assert.equal(careText('en','goodbyeTitle',{name:'Mochi'}), 'Say goodbye to Mochi');
 assert.equal(careText('de','helpClose'), careCopy.en.helpClose);
 assert.ok(!/\d{3}/.test(Object.values(careCopy).map(c=>c.helpUrgent).join(' ')), 'no invented phone numbers');
 assert.equal(HELPLINE_URL, 'https://findahelpline.com');
});

test('goodbye is remembered per pet and survives broken storage', () => {
 const map = new Map(); const storage = {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 assert.equal(readFarewell(storage,'a'), null);
 saveFarewell(storage,'a',new Date('2026-10-25T03:00:00Z'));
 assert.equal(readFarewell(storage,'a'), '2026-10-25T03:00:00.000Z');
 assert.equal(readFarewell(storage,'b'), null);
 assert.equal(farewellKey('x'.repeat(200)).length, 'pawprint-farewell:'.length + 80);
 const broken = {getItem(){throw new Error('blocked');},setItem(){throw new Error('blocked');}};
 assert.equal(readFarewell(broken,'a'), null);
 assert.doesNotThrow(() => saveFarewell(broken,'a',new Date()));
});

test('break reminder appears once after the threshold', () => {
 let now = 0; const due = createBreakTimer({now:()=>now, after:1000});
 assert.equal(due(), false); now = 999; assert.equal(due(), false);
 now = 1000; assert.equal(due(), true); now = 5000; assert.equal(due(), false);
});
