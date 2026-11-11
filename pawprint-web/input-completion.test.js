import test from 'node:test';
import assert from 'node:assert/strict';
import {clearSubmittedInput} from './src/input-completion.js';

test('a handled local or AI reply clears only the text that was submitted',()=>{
 const input={value:'  Lanlao, come here  '};
 clearSubmittedInput(input,'Lanlao, come here');
 assert.equal(input.value,'');
 input.value='A new message';
 clearSubmittedInput(input,'Lanlao, come here');
 assert.equal(input.value,'A new message');
});
