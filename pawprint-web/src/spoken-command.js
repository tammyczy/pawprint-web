import {normalizeSpokenName} from './spoken-name.js';

// People do not speak the way they type. A spoken "跑起来", "坐", "go run" or
// "come here Lanlao" is a plain command, but the typed-command parser only
// knows a short list of exact phrases, so these used to fall through to
// conversation and the pet stayed still. This table maps a WHOLE spoken
// utterance to the canonical command the rest of the app already accepts.
// Natural requests can also match action words, with context checks below.
const spoken={
 'come here':['come','come here','come on','come over','come over here','come to me','come closer','come here boy','come here girl','here boy','over here',
  '来','过来','過來','快过来','快過來','过来这里','過來這裡','过来这儿','来这里','來這裡','来这儿','来我这里','來我這裡','来我这儿','到这里来','到這裡來','到我这里来','到我這裡來','到我这来','到我这儿来'],
 'walk':['walk','go walk','walk around','go for a walk','take a walk','take a work','lets go for a work','lets walk','lets go for a walk','walk with me',
  '走','走走','走一走','走路','走两步','走兩步','走一下','散步','散散步','去散步','一起散步','一起走走','陪我散步','陪我走走','let us go for a walk'],
 'run':['run','go run','run run','run around','run fast','lets run','run with me','go',
  '跑','跑起来','跑起來','快跑','跑步','跑一跑','跑一下','跑两步','跑兩步','跑快点','跑快點','跑快一点','跑快一點','跑一圈','run for me'],
 'jump':['jump','jump up','jump jump','jump once','jump for me',
  '跳','跳一下','跳起来','跳起來','跳一跳','跳高','跳一个','跳一個','give me a jump'],
 'wag your tail':['wag','wag tail','wag your tail','wag the tail','shake your tail',
  '摇尾巴','搖尾巴','摇摇尾巴','搖搖尾巴','摇一摇尾巴','摇一下尾巴','摇摇你的尾巴','搖搖你的尾巴','尾巴摇一摇','摇尾','搖尾','wag your tail for me'],
 // In short voice commands the browser often hears "sit" as "set" or "seat".
 'sit':['sit','sit down','sit boy','sit girl','take a seat','set','seat','set down','seat down','level six',
  '坐','坐下','坐下来','坐下來','坐好','做下','座下'],
 'lie down':['lie down','lay down','down','lie',
  '趴','趴下','趴下来','趴下來','躺下','卧下','臥下','卧倒','爬下'],
 'stand up':['stand','stand up','get up','up',
  '站','站起来','站起來','起来','起來','站好','起立'],
 'stop':['stop','stop it','stop moving','stay','stay still','freeze','wait',
  '停','停下','停下来','停下來','停止','别动','別動','不要动','不要動','站住','等一下']
};
const lookup=new Map();
for(const [command,phrases] of Object.entries(spoken))for(const phrase of phrases)lookup.set(phrase,command);
const name='(?:lanlao|蓝老|藍老)';
function bare(text){
 let value=text.normalize('NFKC').toLowerCase().replace(/['’]/g,'').replace(/[.,!?;:，。！？；：、~～]+/gu,' ').replace(/\s+/g,' ').trim();
 value=value.replace(new RegExp(`^(?:hey |hi |ok |okay )?${name}\\s*`,'u'),'').replace(new RegExp(`\\s*${name}$`,'u'),'').trim();
 value=value.replace(/^(?:(?:can|could|would) you )/u,'');
 value=value.replace(/^(?:please |now )+/u,'').replace(/(?: please| now)+$/u,'').trim();
 if(/[㐀-鿿]/u.test(value))value=value.replace(/\s/g,'').replace(/^(?:请你|請你|请|請|快点|快點|可以)+(?=.)/u,'').replace(/(?:一下吧|吧|呀|啊|嘛|啦|吗|嗎)+$/u,'');
 return value;
}
// Only infer a single action in a request-shaped utterance. A bare keyword in
// a story, negation, hypothetical or multi-action request is not enough.
function keywordCommand(text){
 const s=text.normalize('NFKC').toLowerCase().replace(/[’‘]/g,"'").trim();
 if(/["“”「」『』]/u.test(s)||/不要|不用|不能|不许|不許|别|別|没|沒|没有|沒有|昨天|刚才|剛才|以前|记得|記得|看到|喜欢|喜歡|如果|假如|要是|故事|然后|然後|接着|接著|再.{0,4}(?:跑|跳|走)|\b(?:don't|do not|not|never|can't|cannot|if|when|yesterday|saw|remember|like|then|and|stop|talk|talking|about)\b/u.test(s))return null;
 const zh=/[㐀-鿿]/u.test(s);
 const request=zh?/^(?:(?:蓝老|藍老|兰老|蘭老)[，,:：\s]*)?(?:你|请|請|快|给我|給我|陪我|可以|能|让|讓|跑|跳|走|摇|搖)/u.test(s):/^(?:(?:hey\s+)?lanlao[,\s]+)?(?:please|can you|could you|would you|will you|run|jump|walk|wag)\b/u.test(s);
 if(!request)return null;
 const patterns=zh?[['run',/跑/u],['jump',/跳/u],['walk',/走|散步/u],['wag your tail',/(?:摇|搖|摆|擺).{0,5}尾巴/u]]:[['run',/\brun(?:ning)?\b/u],['jump',/\bjump(?:ing)?\b/u],['walk',/\bwalk(?:ing)?\b/u],['wag your tail',/\bwag(?:ging)?\b/u]];
 const matches=patterns.filter(([,pattern])=>pattern.test(s));
 return matches.length===1?matches[0][0]:null;
}
// Returns the canonical command for a whole spoken command, otherwise the
// transcript with only a misheard name corrected.
export function normalizeSpokenCommand(text){
 if(typeof text!=='string')return text;
 const named=normalizeSpokenName(text);
 const value=bare(named);
 // Observed misrecognitions of the name are only removed when the rest is
 // itself a complete, known command; never reinterpret ordinary conversation.
 const misheard=value.replace(/^(?:烦恼|煩惱|返老)\s*/u,'');
 return lookup.get(value)||(misheard!==value&&lookup.get(bare(misheard)))||keywordCommand(named)||named;
}
