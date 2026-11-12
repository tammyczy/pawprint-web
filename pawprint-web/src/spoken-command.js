import {normalizeSpokenName} from './spoken-name.js';

// People do not speak the way they type. A spoken "跑起来", "坐", "go run" or
// "come here Lanlao" is a plain command, but the typed-command parser only
// knows a short list of exact phrases, so these used to fall through to
// conversation and the pet stayed still. This table maps a WHOLE spoken
// utterance to the canonical command the rest of the app already accepts.
// Nothing is guessed from part of a sentence: "don't run" or "I saw a dog run"
// match no entry and are passed on unchanged.
const spoken={
 'come here':['come','come here','come on','come over','come over here','come to me','come closer','come here boy','come here girl','here boy','over here',
  '来','过来','過來','快过来','快過來','过来这里','過來這裡','过来这儿','来这里','來這裡','来这儿','来我这里','來我這裡','来我这儿','到这里来','到這裡來','到我这里来','到我這裡來','到我这来','到我这儿来'],
 'walk':['walk','go walk','walk around','go for a walk','take a walk','lets walk','lets go for a walk','walk with me',
  '走','走走','走一走','走路','走两步','走兩步','走一下','散步','散散步','去散步','一起散步','陪我散步','陪我走走'],
 'run':['run','go run','run run','run around','run fast','lets run','run with me','go',
  '跑','跑起来','跑起來','快跑','跑步','跑一跑','跑一下','跑两步','跑兩步','跑快点','跑快點','跑一圈'],
 'jump':['jump','jump up','jump jump','jump once','jump for me',
  '跳','跳一下','跳起来','跳起來','跳一跳','跳高','跳一个','跳一個'],
 'wag your tail':['wag','wag tail','wag your tail','wag the tail','shake your tail',
  '摇尾巴','搖尾巴','摇摇尾巴','搖搖尾巴','摇一摇尾巴','摇一下尾巴','尾巴摇一摇','摇尾','搖尾'],
 'sit':['sit','sit down','sit boy','sit girl','take a seat',
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
 value=value.replace(/^(?:please |now )+/u,'').replace(/(?: please| now)+$/u,'').trim();
 if(/[㐀-鿿]/u.test(value))value=value.replace(/\s/g,'').replace(/^(?:请你|請你|请|請|快点|快點)+(?=.)/u,'').replace(/(?:一下吧|吧|呀|啊|嘛|啦)+$/u,'');
 return value;
}
// Returns the canonical command for a whole spoken command, otherwise the
// transcript with only a misheard name corrected.
export function normalizeSpokenCommand(text){
 if(typeof text!=='string')return text;
 const named=normalizeSpokenName(text);
 return lookup.get(bare(named))||named;
}
