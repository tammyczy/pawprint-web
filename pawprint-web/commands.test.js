import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseCommand} from './src/commands.js';
test('中文与繁体语音指令',()=>{for(const [text,result] of [['蓝老，过来','come'],['藍老，過來','come'],['蓝老跑步','run'],['走一走','walk'],['摇尾巴','wag'],['搖尾巴','wag'],['跳一下','jump'],['停止跑步','stop'],['回去','home'],['不要跑','null'],['你好','null']])assert.equal(String(parseCommand(text)),result);});
