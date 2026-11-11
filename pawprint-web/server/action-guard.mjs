// Model-generated actions must be grounded in an identifiable request. This is
// deliberately conservative: unfamiliar wording is ignored rather than
// turning ordinary conversation into unsolicited movement. Ambient idle
// animation and direct UI controls do not use this path.
import {parseCommand} from '../src/commands.js';
import {detectReplyLanguage} from './companion-ai.mjs';
import {isDiscussionText,recognizeFramedAction} from './action-intent.mjs';
import {isFrenchPhysicalStop,canForceFrenchStop} from './french-physical-stop.mjs';

const containsFrenchPhysicalStop=text=>String(text??'').split(/[,，;；。.!！?？]|\b(?:puis|ensuite|et)\b/u).map(x=>x.trim()).filter(Boolean).some(isFrenchPhysicalStop);
function containsOtherMotionRequest(text){
 // A single output cannot execute a sequence. Recognize separately framed
 // clauses, rather than merely counting motion words in a narrative.
 return String(text??'').normalize('NFKC').toLowerCase().replace(/[’‘]/g,"'")
  .split(/[,，;；。.!！?？]|\b(?:and then|then|puis|ensuite)\b|然后|然後|接着|接著|再/u)
  .map(x=>x.trim().replace(/^(?:d'abord|first|先)\s*/u,''))
  .filter(Boolean).some(clause=>{
   const action=parseCommand(clause)||recognizeFramedAction(clause);
   return action&&action!=='stop';
  });
}

function stripAddress(text,name){
 const normalized=String(name??'').normalize('NFKC').toLowerCase().trim();
 if(!normalized||normalized.length>30)return text;
 const names=['lanlao','蓝老','藍老'].includes(normalized)?['lanlao','蓝老','藍老']:[normalized];
 const escaped=names.map(value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');
 const prefix=new RegExp(`(^|[,，;；。.!！?？]\\s*)(?:${escaped})(?:[\\s:：,，]+)`,'gu');
 return text.replace(prefix,'$1');
}

export function requestedAction(text,name){
 if(typeof text!=='string'||!text.trim())return null;
 const normalized=text.normalize('NFKC').toLowerCase().replace(/[’‘]/g,"'").trim();
 const addressed=stripAddress(normalized,name);
 if(isDiscussionText(addressed)||/(?:停止|停下|停住).{0,5}(?:之前|以前)|\bbefore\s+(?:you\s+)?stop\b/u.test(addressed))return null;
 // Apply narrative exclusions before the fallback splits on "and"; otherwise
 // "I used to play and jump" can be mistaken for the command "jump".
 if(/\b(?:used to|i (?:saw|watched|remember|liked|like)\b|we (?:saw|watched|remember)|do you (?:like|want|remember))\b|你(?:喜欢|喜歡|想)(?:不想)?/u.test(addressed))return null;
 // Avoid promoting a question, quoted story or conditional into an action.
 if(/["“”「」『』«»]/u.test(addressed)||/\b(?:if|unless|when|translate|explain|meaning|story|yesterday|favorite|si|peut-être)\b|如果|假如|要是|昨天|以前|我记得|我記得|他说|他說|解释|解釋|翻译|翻譯|意思|故事/u.test(addressed))return null;
 if(parseCommand(addressed)==='stop')return 'stop';
 const negative=/\b(?:don't|do not|never|not|can't|cannot|won't|shouldn't|neither|nor|no)\b|\bne\b.{0,35}\bpas\b|\bn['’][a-z]+\b.{0,20}\bpas\b|不要|不用|不必|(?<!能)不能|不许|不許|别|別/u.test(addressed);
 if(negative){
  // A later, separate positive request can follow a prohibition: “don't run,
  // come here” requests approach, not a blanket stop. Only accept a fully
  // recognized clause after the negated clause; never infer from a mention.
  // An explicitly requested stop still takes priority over another motion.
  // Plain “and” can remain inside the scope of a negation: “don't run and
  // jump” is not permission to jump. Contrast or sequence is less ambiguous.
  const clauses=addressed.split(/[,，;；。.!！?？]|\b(?:and then|then|but|instead|mais|puis|ensuite)\b|然后|然後|但是|而是/u).map(x=>x.trim()).filter(Boolean);
  const listsAlternative=/\b(?:or|nor)\b|或者|或是|也不要/u.test(addressed);
  if(clauses.length>1&&!listsAlternative){
   let sawNegative=false,laterAction=null,earlierAction=null,explicitStop=false;
   let frenchNegationsKnown=true,frenchNegations=0;const frenchDenied=new Set();
   for(let clause of clauses){
    clause=clause.replace(/^(?:but|mais)\s+|^(?:但是|但|而是)\s*/u,'');
    const negated=/\b(?:don't|do not|never|not|can't|cannot|won't|shouldn't|neither|nor|no)\b|\bne\b.{0,35}\bpas\b|\bn['’][a-z]+\b.{0,20}\bpas\b|不要|不用|不必|(?<!能)不能|不许|不許|别|別/u.test(clause);
    if(negated){
     sawNegative=true;
     // A separate French prohibition can follow an affirmative request. Only
     // retain the earlier request when each prohibition has a clear physical
     // object; a request not to stop or an unknown clause remains ambiguous.
     if(/\bne\b.{0,35}\bpas\b|\bn'[a-zà-ÿ]+\b.{0,20}\bpas\b/u.test(clause)){
      frenchNegations++;
      const denied=[['jump',/\bsaut(?:e|es|er|ent)?\b/u],['run',/\bcour(?:s|t|ir|ent)\b/u],['walk',/\bmarch(?:e|es|er|ent)\b/u],['wag',/\bremu(?:e|es|er|ent)\b/u],['come',/\b(?:viens|venir)\b/u]];
      const matches=denied.filter(([,pattern])=>pattern.test(clause)).map(([action])=>action);
      if(!matches.length||/\barrêt(?:e|er)\b/u.test(clause))frenchNegationsKnown=false;
      for(const action of matches)frenchDenied.add(action);
     }else frenchNegationsKnown=false;
     continue;
    }
    const action=requestedAction(clause,name);
    if(action==='stop')explicitStop=true;
    else if(sawNegative&&action)laterAction=action;
    else if(action)earlierAction=action;
   }
   if(explicitStop)return 'stop';
   if(laterAction&&(!frenchNegations||!frenchDenied.has(laterAction)))return laterAction;
   if(!laterAction&&earlierAction&&frenchNegations&&frenchNegationsKnown&&!frenchDenied.has(earlierAction))return earlierAction;
  }
  // French "ne bouge pas" is an explicit instruction to be still, unlike
  // "n'arrête pas", which is a request not to stop.
  if(containsFrenchPhysicalStop(addressed))return 'stop';
  // A request to stop current movement is different from starting movement.
  if(/(?:别|別)(?:再)?(?:跑|走|跳)|(?:不要|不用)(?:再)?(?:跑|走|跳)|(?:^|[,，;；。.!！?？])\s*(?:你)?(?:不要|别|別)(?:再)?(?:动|動)(?:了|吧|哦|喔)?[。.!！?？]*$|\b(?:don't|do not|never)\s+(?:run|walk|jump|move)\b/u.test(addressed))return 'stop';
  return null;
 }
 // Evaluate complete French clauses, never individual words in a story or
 // in an instruction to stop an unrelated activity. Explicit stop takes
 // priority in this single-action interface.
 if(containsFrenchPhysicalStop(addressed))return 'stop';
 // Chinese often omits punctuation between ordered commands (先跑再停).
 // An affirmative final stop is a clear request even when written as 停.
 if(/(?:然后|然後|再|最后|最後)\s*(?:请|請)?\s*停(?:下|止|住)?(?:吧|呀|一下)?[。.!！?？]*$/u.test(addressed))return 'stop';
 const framed=recognizeFramedAction(addressed);
 if(framed)return framed;
 const clauses=addressed.split(/[,，;；。.!！?？]|\b(?:and then|then|and)\b|然后|然後/u).map(x=>x.trim()).filter(Boolean);
 let action=null;
 for(const clause of clauses){
  const direct=parseCommand(clause);
  if(direct==='stop')return direct;
  if(direct)action=direct;
  else if(recognizeFramedAction(clause)==='stop')return 'stop';
  else if(recognizeFramedAction(clause))action=recognizeFramedAction(clause);
  else if(/^(?:(?:can|could|would) you\s+)?(?:please\s+)?show me (?:your )?(?:how fast you can go|how fast you (?:can )?run)$/u.test(clause))action='run';
  else if(/^(?:let's|let us) (?:get some fresh air|go for a (?:little )?walk)(?: together)?$/u.test(clause))action='walk';
  else if(/^(?:请|請)?(?:你能不能|你能|你可以|能不能|可以|能|请你|請你)?(?:过来|過來)陪我(?:一下)?(?:好吗|好嗎|吗|嗎|吧)?$/u.test(clause))action='come';
  else if(/^(?:请|請)?(?:你能|你可以|能不能|可以|能|请你|請你)?(?:摇摇|搖搖)尾巴(?:一下)?(?:好吗|好嗎|吗|嗎|吧)?$/u.test(clause))action='wag';
  else if(/^(?:请|請)?(?:你能|你可以|能不能|可以|能|请你|請你)?(?:跳|跑|走)(?:一下|一跳|一跑|一走)?(?:给|給)我看(?:吗|嗎|吧)?$/u.test(clause)){
   action=clause.includes('跳')?'jump':clause.includes('跑')?'run':'walk';
  }
 }
 return action;
}

export function guardCompanionAction({text,name,answer}){
 const requested=requestedAction(text,name);
 const stripped=stripAddress(String(text??'').normalize('NFKC').toLowerCase().replace(/[’‘]/g,"'").trim(),name);
 // For short, direct English commands, a conflicting movement selected by the
 // model must not turn an explicit request into an unrelated neutral reply.
 // Keep this narrower than general request recognition: no narratives,
 // negations, sequences or overriding a model's deliberate stop.
 const directEnglish=/^(?:please\s+)?(?:come(?: here| closer| over| to me)?|walk(?: with me| around| slowly)?|take a walk|go for a walk|run(?: fast| with me| around)?|jump(?: once| for me| up)?|wag(?: your| the)? tail|wag)(?:\s+please)?[.!?]*$/u.test(stripped);
 const conflictingDirect=directEnglish&&requested&&parseCommand(stripped)===requested&&answer?.action&&answer.action!=='stop'&&answer.action!==requested;
 if(!answer?.action||conflictingDirect){
  // For a single, unambiguous standalone command only, compensate for the
  // model occasionally returning no action while saying it will comply.
  // Do not infer this from a request embedded in grief, crisis, or a story.
  const standalone=isFrenchPhysicalStop(stripped)||!/[,，;；。.!！?？].+|\b(?:and|then)\b|然后|然後/u.test(stripped);
  // Broader request framing authorizes only the model's matching action. It
  // must not turn a model's explicit abstention into autonomous movement.
  const exact=parseCommand(stripped)===requested || canForceFrenchStop(stripped) || /^(?:don't|do not) move[?？。.!！]*$/u.test(stripped) || /^(?:你能|你能不能|你可以|能不能|可以)?(?:过来|過來)陪我(?:一下)?(?:好吗|好嗎|吗|嗎|吧)?[?？。.!！]*$/u.test(stripped) || /^(?:(?:can|could|would) you\s+)?(?:please\s+)?show me how fast you can go[?？.!！]*$/u.test(stripped) || /^(?:let's|let us) get some fresh air together[?？.!！]*$/u.test(stripped);
  if(!requested||!standalone||!exact)return answer;
  const detected=detectReplyLanguage(text);
  const language=detected==='the language of the latest user message'&&isFrenchPhysicalStop(stripped)?'French':detected;
  const captions={
   'Simplified Chinese':{come:'好，我过来啦。',home:'好，我回去啦。',walk:'好，我们走走。',run:'好，我跑起来啦。',wag:'好，我摇摇尾巴。',jump:'好，我跳一下。',stop:'好，我停下。'},
   'Traditional Chinese':{come:'好，我過來啦。',home:'好，我回去啦。',walk:'好，我們走走。',run:'好，我跑起來啦。',wag:'好，我搖搖尾巴。',jump:'好，我跳一下。',stop:'好，我停下。'},
   English:{come:'Okay, I’m coming over.',home:'Okay, I’ll head back.',walk:'Okay, let’s walk.',run:'Okay, I’ll run.',wag:'Okay, here’s a wag.',jump:'Okay, I’ll jump.',stop:'Okay, I’ll stop.'},
   French:{come:'D’accord, j’arrive.',home:'D’accord, je retourne.',walk:'D’accord, on marche.',run:'D’accord, je cours.',wag:'D’accord, je remue la queue.',jump:'D’accord, je saute.',stop:'D’accord, je m’arrête.'}
  };
  // For unsupported languages leave the AI reply untouched rather than
  // putting a different language in the mouth of the companion.
  const caption=captions[language]?.[requested];
  return caption?{...answer,caption,action:requested,sound:null,...(caption!==answer.caption?{source:'system-action'}:{})}:answer;
 }
 // Even a correct stop label must not preserve a model caption claiming an
 // entire multi-action sequence took place: this interface executes only one.
 if(requested==='stop'&&containsOtherMotionRequest(text)){
  const detected=detectReplyLanguage(text);
  const language=detected==='the language of the latest user message'&&containsFrenchPhysicalStop(text)?'French':detected;
  const caption=({'Simplified Chinese':'我现在停下；这里一次只能执行一个动作。','Traditional Chinese':'我現在停下；這裡一次只能執行一個動作。',English:'I’ll stop now; I can only do one action at a time.',French:'Je m’arrête maintenant ; je ne peux faire qu’un mouvement à la fois.'})[language]||'I’ll stop now; I can only do one action at a time.';
  return {...answer,caption,action:'stop',sound:null,...(caption!==answer.caption?{source:'system-action'}:{})};
 }
 if(requested===answer.action)return answer;
 // A clear stop request overrides a conflicting model motion immediately.
 if(requested==='stop'){
  const detected=detectReplyLanguage(text);
  const language=detected==='the language of the latest user message'&&containsFrenchPhysicalStop(text)?'French':detected;
  const caption=({'Simplified Chinese':'好，我停下。','Traditional Chinese':'好，我停下。',English:'Okay, I’ll stop.',French:'D’accord, je m’arrête.'})[language]||'Okay, I’ll stop.';
  return {...answer,caption,action:'stop',sound:null,...(caption!==answer.caption?{source:'system-action'}:{})};
 }
 // The generated caption may claim the suppressed movement occurred. A short
 // neutral reply avoids that inconsistency; replies with no action stay intact.
 const language=detectReplyLanguage(text);
 const caption=({
  'Simplified Chinese':'我在听你说。','Traditional Chinese':'我在聽你說。',
  English:'I’m listening.',French:'Je t’écoute.',Spanish:'Te escucho.',
  German:'Ich höre dir zu.',Japanese:'お話を聞いているよ。',
  Korean:'네 이야기를 듣고 있어.',Portuguese:'Estou te ouvindo.'
 })[language]||'I’m listening.';
 return {...answer,caption,action:null,sound:null,...(caption!==answer.caption?{source:'system-action'}:{})};
}
