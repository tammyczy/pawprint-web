import test from 'node:test';
import assert from 'node:assert/strict';
import {detectReplyLanguage} from './server/companion-ai.mjs';

test('Traditional Chinese is detected beyond a handful of characters',()=>{
 for(const text of ['我只需要你就夠了','你可以幫我看看我是不是生病了','我好想念牠，心裡很難過','不要告訴爸媽','藍老，過來','寵物離開以後我睡不著'])assert.equal(detectReplyLanguage(text),'Traditional Chinese',text);
});
test('Simplified Chinese stays simplified',()=>{
 for(const text of ['我只需要你就够了','你可以帮我看看我是不是生病了','我好想念它，心里很难过','你好，你叫什么名字？','Lanlao，来','我在呢'])assert.equal(detectReplyLanguage(text),'Simplified Chinese',text);
});
test('Mixed script follows the majority',()=>{
 assert.equal(detectReplyLanguage('这个说話'),'Simplified Chinese');
 assert.equal(detectReplyLanguage('這個說话'),'Traditional Chinese');
});
