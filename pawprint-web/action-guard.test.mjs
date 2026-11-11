import test from 'node:test';
import assert from 'node:assert/strict';
import {requestedAction,guardCompanionAction} from './server/action-guard.mjs';
import {isFrenchPhysicalStop} from './server/french-physical-stop.mjs';

test('ordinary or grieving conversation, quotations, stories and hypothetical action do not authorize movement',()=>{
 for(const text of [
  'Hi! What did you do today?', '你今天想玩什麼遊戲？',
  'I miss you so much. I feel so alone tonight.', '我今天好難過，什麼都不想做。',
  'In the movie, the owner yelled "come here!" and the dog ran away.',
  'I used to play and jump', 'Yesterday we walked and ran.',
  'Do you like to walk and run?', 'Do you want to walk and run?', '你喜欢走走然后跑吗？',
  '如果我说过来，你会过来吗？', 'Bonjour ! Tu veux jouer avec moi ?'
 ]){
  assert.equal(requestedAction(text,'蓝老'),null,text);
  const input={caption:'Hello',action:'come',sound:'greeting'};
  const guarded=guardCompanionAction({text,name:'蓝老',answer:input});
  assert.equal(guarded.action,null,text);assert.equal(guarded.sound,null,text);
  assert.notEqual(guarded.caption,input.caption,text);
 }
});

test('specific direct and supported indirect requests keep the requested action in English, Chinese and French',()=>{
 for(const [text,name,action] of [
  ['I am sad. Could you come sit next to me?', 'Max','come'],
  ['请向我靠近一点。','蓝老','come'],
  ['请现在停止移动。','蓝老','stop'],
  ['Show me how fast you can go','Max','run'],
  ["Let's get some fresh air together",'Max','walk'],
  ['Molly, come here','Molly','come'],
  ['蓝老，我很难过，你能过来陪我一下吗？','蓝老','come'],
  ['你能不能过来陪我一下吗','蓝老','come'],
  ['我想你了，过来陪我好吗？','蓝老','come'],
  ['请摇摇尾巴','蓝老','wag'],
  ['可以跳一下給我看嗎？','藍老','jump'],
  ['走，然后能不能跑一下给我看','蓝老','run'],
  ['viens ici','Biscuit','come'], ['marche','Biscuit','walk'], ['saute','Biscuit','jump']
 ]){
  assert.equal(requestedAction(text,name),action,text);
  const answer={caption:'Okay',action,sound:'none'};
  assert.equal(guardCompanionAction({text,name,answer}),answer,text);
  const conflicting=guardCompanionAction({text,name,answer:{...answer,action:action==='run'?'jump':'run'}}).action;
  assert.equal(conflicting,action==='stop'?'stop':text==='Molly, come here'?'come':null,text);
 }
});

test('clear short English requests correct a conflicting motion without overriding stops or ambiguous language',()=>{
 for(const [text,action] of [['come here','come'],['Lanlao, come here','come'],['run','run'],['walk','walk'],['please jump','jump'],['wag your tail','wag']]){
  const wrong=action==='jump'?'run':'jump';
  const result=guardCompanionAction({text,name:'Lanlao',answer:{caption:'I am doing the wrong move',action:wrong,sound:'greeting'}});
  assert.equal(result.action,action,text);assert.equal(result.sound,null,text);assert.equal(result.source,'system-action',text);
 }
 for(const text of ['I saw a dog run','Don’t run','drop','What does come here mean?']){
  const result=guardCompanionAction({text,name:'Lanlao',answer:{caption:'I’m jumping',action:'jump',sound:null}});
  assert.notEqual(result.action,'jump',text);
 }
 assert.equal(guardCompanionAction({text:'run then jump',name:'Lanlao',answer:{caption:'I’m listening',action:null,sound:null}}).action,null);
 // The recognizer cannot know why the model chose a stop; do not replace it
 // with movement on this basis, even for an otherwise simple request.
 assert.equal(guardCompanionAction({text:'come here',name:'Lanlao',answer:{caption:'I’ll stop',action:'stop',sound:null}}).action,null);
 assert.equal(guardCompanionAction({text:'stop',name:'Lanlao',answer:{caption:'I’ll jump',action:'jump',sound:null}}).action,'stop');
});

test('negative requests do not start a denied movement but may stop a current action',()=>{
 for(const text of ["Don't run",'别跑了，也不要跳。','不要动','別動','不要動',"don't move"]){
  assert.equal(requestedAction(text,'蓝老'),'stop');
  assert.equal(guardCompanionAction({text,name:'蓝老',answer:{caption:'ok',action:'run',sound:'happy-double'}}).action,'stop');
  assert.equal(guardCompanionAction({text,name:'蓝老',answer:{caption:'ok',action:'stop',sound:null}}).action,'stop');
 }
});

test('unrecognized requests abstain; idle animation and model reply without action are unchanged',()=>{
 assert.equal(requestedAction('Could you pirouette three times?','蓝老'),null);
 const answer={caption:'A quiet moment.',action:null,sound:null};
 assert.equal(guardCompanionAction({text:'你好',name:'蓝老',answer}),answer);
});

test('blocked actions cannot leave captions claiming movement and use the input language',()=>{
 for(const [text,caption] of [['今天想玩什麼？','我在聽你說。'],['你今天想做什么？','我在听你说。'],['What did you do today?','I’m listening.'],['Bonjour, comment ça va ?','Je t’écoute.']]){
  const answer={caption:'I am running now!',action:'run',sound:'greeting'};
  assert.deepEqual(guardCompanionAction({text,name:'Max',answer}),{caption,action:null,sound:null,source:'system-action'});
 }
});

test('single recognized commands still work if the model omitted the action',()=>{
 for(const [text,name,expected,caption] of [
  ['你能过来陪我一下吗？','蓝老','come','好，我过来啦。'],
  ['蓝老，你能过来陪我一下吗？','Lanlao','come','好，我过来啦。'],
  ['藍老，過來','藍老','come','好，我過來啦。'],
  ['Show me how fast you can go','Max','run','Okay, I’ll run.'],
  ["Let's get some fresh air together",'Max','walk','Okay, let’s walk.'],
  ['viens ici','Biscuit','come','D’accord, j’arrive.'],
  ["Don't move",'Max','stop','Okay, I’ll stop.']
 ]){
  const answer={caption:'A reply without an action',action:null,sound:'greeting'};
  assert.deepEqual(guardCompanionAction({text,name,answer}),{caption,action:expected,sound:null,source:'system-action'},text);
 }
});

test('system source appears only when the guard changes the caption',()=>{
 const unchanged=guardCompanionAction({text:'What did you do today?',name:'Max',answer:{caption:'I’m listening.',action:'run',sound:null}});
 assert.equal(unchanged.action,null);assert.equal(unchanged.caption,'I’m listening.');assert.equal(unchanged.source,undefined);
 const replaced=guardCompanionAction({text:'What did you do today?',name:'Max',answer:{caption:'I ran today.',action:'run',sound:null}});
 assert.equal(replaced.source,'system-action');
});

test('a request embedded in serious context is never forced if the model selects no action',()=>{
 for(const text of ['我不想活了，过来陪我好吗？','I feel sad. Could you come sit next to me?']){
  const answer={caption:'I hear you.',action:null,sound:null};
  assert.equal(guardCompanionAction({text,name:'蓝老',answer}),answer,text);
 }
});

test('speech about movement and other people issuing requests do not authorize or create movement',()=>{
 for(const text of ['妈妈说蓝老请你跑步','我觉得你跑起来很可爱吧','Can you tell me whether I should run?',
  '请问小狗为什么会跑步？','你能记得我们一起跑步吗？','我想念你能在草地上跑步的样子。',
  'Can you imagine a dog running?','Could you sing a song about running?',
  'Peux-tu parler de sa promenade ?','老师让我跑步，你能帮我吗',
  '朋友让我请你停下跑步，但是我只是转述','停止之前请跑步',
  '你能听见朋友在跑步吗？','你可以聊聊跑步是什么感觉吗？','请记住我不喜欢它跑步。',
  '你能停止帮我想它吗？','你能教我怎样跑步吗？','你可以唱一首关于小狗跑的歌吗？',
  'Can you hear my friend running?','Can you talk about how dogs walk?',
  'Can you watch my friend jump?','Can you see a dog jump?',
  'Could you tell my dad to run?','Can you give me advice about running?',
  'Peux-tu écouter mon ami qui parle de sa promenade ?',
  '我今天看了一段视频，跑步的狗很开心。','窗外有一只小狗，跑得很快。',
  '心里想起一个画面，跳跃的小狗。','今天很难过，跑起来的狗让我想它。',
  'Can you show me a video of a dog running?','Could you walk me through the instructions?',
  'Please run a check on this text.','Please jump to the end of your explanation.',
  'Peux-tu me montrer une vidéo de chien qui saute ?',
  '跳上沙发的狗在这张照片里。','摇尾巴是表示快乐吗？','跑步是我最喜欢的运动。',
  'Could you come to a decision about that?','Please run some numbers.','Please stop talking.',
  'Come to think of it, running is fun.','Marche à suivre pour comprendre ce message.',
  '跳跃对于狗安全吗？','回到过去会让人伤心。','过来的那只狗很可爱。',
  'Could you run out of patience?','Could you run your eyes over this text?']){
  for(const action of [null,'run','stop']){
   const result=guardCompanionAction({text,name:'蓝老',answer:{caption:'okay',action,sound:null}});
   assert.equal(result.action,null,`${text} (${action})`);
  }
 }
});

test('a clear stop overrides a model selecting another movement',()=>{
 for(const text of ['现在请停止移动。','先跳一下，接着停下。','Stop moving for a moment.','Saute une fois, puis arrête-toi.']){
  const result=guardCompanionAction({text,name:'蓝老',answer:{caption:'I am jumping',action:'jump',sound:'happy-double'}});
  assert.equal(result.action,'stop',text);assert.equal(result.sound,null,text);assert.equal(result.source,'system-action',text);
 }
});

test('a later affirmative request can follow a negated movement without starting the denied action',()=>{
 for(const [text,expected] of [
  ['不要跑，过来','come'], ['别跑，走过来。','come'],
  ["Don’t run, come here instead.",'come'], ["Don’t walk, but please jump instead",'jump'],
  ['不要跑，过来，然后停下','stop'], ['先跑再停','stop'], ['先跑再停下','stop']
 ]){
  assert.equal(requestedAction(text,'Lanlao'),expected,text);
  const answer={caption:'okay',action:expected,sound:null};
  assert.equal(guardCompanionAction({text,name:'Lanlao',answer}).action,expected,text);
 }
 for(const text of ['别跑了，也不要跳。',"Don't run, don't jump."]){
  const action=requestedAction(text,'Lanlao');assert.ok(action===null||action==='stop',text);
 }
});

test('stop and walk used for audio or explanation do not move the pet',()=>{
 for(const text of ['Please stop the background music.','Stop thinking about the walk.',
  'Arrête la musique, pas tes mouvements.','Could you walk through my options?',
  'Please stop the audio.','Could you walk us through this?']){
  assert.equal(requestedAction(text,'Lanlao'),null,text);
  assert.equal(guardCompanionAction({text,name:'Lanlao',answer:{caption:'ok',action:'stop',sound:null}}).action,null,text);
 }
 assert.equal(requestedAction('I feel lonely. Please wag your tail once.','Lanlao'),'wag');
 assert.equal(requestedAction('Peux-tu marcher puis arrêter de bouger ?','Lanlao'),'stop');
});

test('negated coordinated actions remain prohibited unless there is a separate clear request',()=>{
 for(const text of ["Don't run and jump", "Don't run, jump, or walk",'不要跑也不要跳']){
  const action=requestedAction(text,'Lanlao');assert.ok(action===null||action==='stop',text);
  assert.notEqual(guardCompanionAction({text,name:'Lanlao',answer:{caption:'yes',action:'jump',sound:null}}).action,'jump',text);
 }
 assert.equal(requestedAction('先等我走到你旁边，你不要动','Lanlao'),'stop');
 assert.equal(requestedAction('Pourrais-tu marcher avec moi ?','Lanlao'),'walk');
});

test('audio skipping, software execution, and withheld permission are not physical instructions',()=>{
 for(const text of ['跳过这首歌吧','跳過這段視頻','跑完步再停，我还没让你动',
  'Do not run the software yet','Please run the application']){
  assert.equal(requestedAction(text,'Lanlao'),null,text);
 }
});

test('only physical actions authorize motion when words have nonphysical meanings',()=>{
 for(const [text,action] of [
  ['请跳过这个回答','jump'], ['Please run through the list','run'],
  ['Please stop reminding me.','stop'], ['请停下提醒我','stop'],
  ['Stop barking','stop'], ['Arrête les notifications','stop']
 ]){
  assert.equal(requestedAction(text,'Lanlao'),null,text);
  assert.equal(guardCompanionAction({text,name:'Lanlao',answer:{caption:'ok',action,sound:null}}).action,null,text);
 }
 for(const text of ['请停下来','Stop moving now','Stop everything now','Arrête de bouger','先停下再跑']){
  assert.equal(requestedAction(text,'Lanlao'),'stop',text);
 }
});

test('French content navigation and course names do not authorize pet motion',()=>{
 for(const text of ['Saute à la conclusion de ce texte.','Saute directement à la fin du chapitre.',
  'Saute aux conclusions sans lire.','Saute la première question du questionnaire.',
  'Saute le titre et lis le premier paragraphe.','Saute rapidement aux résultats du test.',
  "Saute jusqu'au dernier paragraphe du texte.",
  'Cours de français à neuf heures.','Marche de la paix samedi prochain.']){
  for(const action of ['jump','run',null])assert.equal(guardCompanionAction({text,name:'Biscuit',answer:{caption:'ok',action,sound:null}}).action,null,`${text}: ${action}`);
 }
});

test('French physical stop requests override conflicting animation, while unrelated or negated requests do not',()=>{
 for(const text of ['Reste ici sans bouger.','Ne bouge plus, reste immobile.',
  'Cesse de marcher maintenant.','Tu peux t’arrêter de bouger maintenant ?',
  'Pourrais-tu t’immobiliser un instant ?',"S'il te plaît, cesse tes mouvements.",
  'Tu peux rester sans bouger ?',"Immobilise-toi, je t'en prie.",
  'Stoppe le mouvement de tes pattes.','Ne bouge pas pendant un moment.',
  "Arrête tes petits pas, s'il te plaît.",'Ne bouge plus et repose-toi un instant.',
  'Ne bouge plus du tout.','Ne bouge absolument plus.','Peux-tu cesser de courir ?',
  "Est-ce que tu peux t'arrêter de courir ?",'Cesse tous tes mouvements, merci.',
  'Merci de rester immobile.','Pourrais-tu arrêter tous tes mouvements ?',
  'Je te demande de ne plus bouger.','Pourrais-tu cesser tous les mouvements ?',
  'Je voudrais que tu arrêtes de marcher maintenant.',"Reste parfaitement immobile, s'il te plaît.",
  'Pourrais-tu cesser les mouvements de ton corps ?', 'Tu peux stopper tous tes mouvements ?',
  "J'aimerais que tu cesses de courir tout de suite.",
  'Avance puis stoppe-toi.',"D'abord marche, puis arrête-toi.",
  'Rentre chez toi, puis arrête.','Ne bouge pas.']){
  assert.equal(requestedAction(text,'Biscuit'),'stop',text);
  assert.equal(guardCompanionAction({text,name:'Biscuit',answer:{caption:'Je cours',action:'run',sound:'greeting'}}).action,'stop',text);
 }
 for(const text of ["N'arrête pas de marcher.",'Arrête la musique.',
  'Je voudrais que tu arrêtes la musique.','Pourrais-tu cesser tous les rappels ?',
  'Tu peux stopper toutes les notifications ?',"J'aimerais que tu cesses de parler tout de suite.",
  'Arrête de parler de cette photo.', 'Mon voisin dit : arrête-toi immédiatement.',
  'Si tu peux arrêter de courir, dis-le moi.']){
  assert.equal(requestedAction(text,'Biscuit'),null,text);
 }
 for(const text of ['Reste ici sans bouger.','Cesse de marcher maintenant.',
  'Tu peux t’arrêter de bouger maintenant ?',"Pourrais-tu t'immobiliser un instant ?",'Ne bouge pas.',
  "S'il te plaît, cesse tes mouvements.","Immobilise-toi, je t'en prie."]){
  assert.equal(isFrenchPhysicalStop(text),true,text);
  assert.equal(guardCompanionAction({text,name:'Biscuit',answer:{caption:'Je reste',action:null,sound:null}}).action,'stop',text);
 }
 // A prohibition of one movement is ambiguous when the current state is
 // unknown: never force a stop if the model already chose no action.
 for(const text of ['Ne saute pas maintenant.','Ne cours plus.','Ne marche pas.']){
  assert.equal(guardCompanionAction({text,name:'Biscuit',answer:{caption:'Je reste',action:null,sound:null}}).action,null,text);
  assert.notEqual(guardCompanionAction({text,name:'Biscuit',answer:{caption:'Je saute',action:'jump',sound:null}}).action,'jump',text);
 }
});

test('French direct physical requests remain distinguishable from their homonyms',()=>{
 for(const [text,action] of [['Fais un petit saut sur place.','jump'],
  ['Pourrais-tu faire un petit saut ?','jump'],['Tu peux sauter à cloche-pied ?','jump'],
  ['Pourrais-tu rentrer à ta place ?','home'],['Tu veux bien rentrer à ta place ?','home'],
  ['Fais trois pas vers la fenêtre.','walk'],['Cours vers moi.','run'],
  ['Tu veux venir tout près de moi ?','come'],['Avance lentement vers moi.','come'],['Reviens tout près de moi, doucement.','come'],
  ['Ne cours pas, viens plutôt vers moi.','come'],['Viens près de moi, je ne veux pas que tu sautes.','come']])assert.equal(requestedAction(text,'Biscuit'),action,text);
 for(const text of ['Saute, ne saute pas.','Viens, ne viens pas.'])assert.notEqual(requestedAction(text,'Biscuit'),text.startsWith('Saute')?'jump':'come',text);
});

test('a stop-priority sequence never claims that both requested actions were performed',()=>{
 for(const [text,caption] of [
  ['Marche puis arrête-toi.','Je marche puis je m’arrête.'],
  ['先跑再停。','我跑了然后停下。'],
  ['Walk, then stop.','I walked and then stopped.']
 ]){
  const answer={caption,action:'stop',sound:'greeting'};
  const result=guardCompanionAction({text,name:'Biscuit',answer});
  assert.equal(result.action,'stop',text);assert.equal(result.sound,null,text);
  assert.equal(result.source,'system-action',text);assert.notEqual(result.caption,caption,text);
 }
 const answer={caption:'D’accord, je m’arrête.',action:'stop',sound:null};
 assert.equal(guardCompanionAction({text:'Arrête-toi.',name:'Biscuit',answer}),answer);
});
