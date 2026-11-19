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
 for(const text of ["don't run",'不要跑','别跑','I saw a dog run','run and jump','我今天跑了很久','你喜欢跑吗','when you run','不要过来','他说过来','I miss you','stop talking about it'])
  assert.equal(normalizeSpokenCommand(text),text,text);
 assert.equal(normalizeSpokenCommand("Lan Lao don't run"),"Lanlao, don't run");
 assert.equal(normalizeSpokenCommand(undefined),undefined);
});
test('polite spoken requests are recognized without accepting negation',()=>{
 for(const text of ['can you run','could you please run','would you jump please','蓝老可以过来吗','请你跑一下']) assert.ok(act(text),text);
 for(const text of ["can you not run",'could you stop talking about running','蓝老可以不要跑吗']) assert.equal(act(text),null,text);
});
test('observed name errors and natural requests match only complete commands',()=>{
 const cases={come:['烦恼过来','返老过来','come to me please','could you come over here'],walk:['let us go for a walk','一起走走'],run:['run for me','跑快一点'],jump:['give me a jump','跳一跳吧'],wag:['摇摇你的尾巴','wag your tail for me']};
 for(const [action,phrases] of Object.entries(cases))for(const phrase of phrases)assert.equal(act(phrase),action,phrase);
 for(const phrase of ['烦恼过来了吗','返老还童','烦恼不要过来','I saw a dog wag your tail for me','不要摇摇你的尾巴'])assert.equal(act(phrase),null,phrase);
});
test('action keywords in natural spoken requests trigger one movement',()=>{
 const cases={run:['蓝老你给我跑一圈看看','快点跑起来给我看看','could you run really fast for me'],jump:['蓝老你跳一个给我看看','请给我跳高一点','please jump really high'],walk:['蓝老陪我走一小段路','please walk a little slower'],wag:['蓝老给我摇摇尾巴看看','please wag your tail for me now']};
 for(const [action,phrases] of Object.entries(cases))for(const phrase of phrases)assert.equal(act(phrase),action,phrase);
 for(const phrase of ['不要跑一下','蓝老别跳给我看','我昨天跑了一圈','我看到狗跳起来','你喜欢跑步吗','如果你跑起来','蓝老跑一下然后跳一下',"please don't jump high",'I saw you run really fast','when you jump'])assert.equal(act(phrase),null,phrase);
});
test('short misheard sit commands are interpreted as sitting',()=>{
 for(const phrase of ['set','seat','set down','seat down','Lanlao seat','please set down','could you seat please','level six'])assert.equal(act(phrase),'sit',phrase);
 for(const phrase of ['set an alarm','set alarm set','I found a seat','I reached level six',"don't sit",'do not set down'])assert.equal(act(phrase),null,phrase);
});
test('a misheard short walk request maps to walking without changing discussion or negation',()=>{
 for(const phrase of ['take a work','Lanlao, take a work','please take a work','lets go for a work'])assert.equal(act(phrase),'walk',phrase);
 for(const phrase of ["don't take a work",'I need to take a work break','the work is difficult'])assert.equal(act(phrase),null,phrase);
});
