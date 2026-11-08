// Deliberately small offline grammar. Unknown phrasing abstains.
// This is a deterministic fallback, not learned AI or animal-emotion recognition.
export function explainCommand(input, {postures=false}={}) {
 if(typeof input!=='string'||!input.trim())return {action:null,reason:'empty',engine:'local-rules'};
 const text=input.normalize('NFKC').toLowerCase().replace(/[’‘]/g,"'").trim();
 if(/["“”「」『』]/u.test(text))return {action:null,reason:'quoted-text',engine:'local-rules'};
 // Check the complete utterance before splitting it: commas and "and" do not
 // remove the scope of a negation, conditional or discussion about commands.
 if(/\b(?:if|unless|when|translate|explain|meaning|definition|words?|commands?|story|yesterday|favorite)\b|如果|假如|要是|昨天|他说|他說|解释|解釋|翻译|翻譯|意思|故事/u.test(text))return {action:null,reason:'context-not-command',engine:'local-rules'};
 const hasNegation=/\b(?:don't|do not|never|not|can't|cannot|won't|shouldn't)\b|不要|不用|不能|不许|不許|别|別/u.test(text);
 if(hasNegation){
  const stopRequest=/(?:^|[,，;；。.!！?？]\s*)(?:(?:lanlao|蓝老|藍老)[\s:：]*)?(?:please\s+)?(?:stop(?: moving| running| walking)?|rest|stay still|停下|停止(?:跑步|走路|移动|移動)?|休息|别动|別動|不要动|不要動)(?:吧|呀)?[.!！。?？]*$/u.test(text);
  return {action:stopRequest?'stop':null,reason:stopRequest?'explicit-stop':'negated',engine:'local-rules'};
 }
 const clauses=text.split(/[,，;；。.!！?？]|\b(?:and then|then|and)\b|然后|然後/u).map(x=>x.trim()).filter(Boolean);
 let action=null,reason='unsupported-phrasing';
 for(let clause of clauses){
  clause=clause.replace(/^(?:lanlao|蓝老|藍老|xiaoq|小q)[\s:：]*/u,'').trim();
  if(!clause)continue;
  if(/\b(?:don't|do not|never|not|can't|cannot|won't|shouldn't)\b|不要|不用|不能|不许|不許/u.test(clause)||/^(?:别|別)(?!动$|動$)/u.test(clause)) {reason='negated';continue;}
  clause=clause.replace(/^(?:please\s+)?(?:(?:can|could|would|will) you\s+|let's\s+)?(?:please\s+)?/u,'').replace(/\s+please$/u,'');
  const en=[
   ['stop',/^(?:stop(?: moving| running| walking)?|rest|stay still|freeze)$/u],
   ['home',/^(?:go home|go back|come back|return(?: home)?)$/u],
   ['come',/^(?:come(?: here| closer| over| to me)?|come (?:sit|stay) (?:with|next to) me)$/u],
   ['walk',/^(?:walk(?: with me| around| slowly)?|take a walk|go for a walk)$/u],
   ['run',/^(?:run(?: fast| with me| around)?|show me (?:your )?zoomies|do zoomies)$/u],
   ['wag',/^(?:wag(?: your| the)? tail|wag)$/u],
   ['jump',/^(?:jump(?: once| for me| up)?|leap)$/u]
  ];
  let found=en.find(([,pattern])=>pattern.test(clause))?.[0];
  if(!found){
   const zh=clause.replace(/\s/g,'').replace(/^(?:请|請)?(?:你能|你可以|能不能|可以|能|请你|請你|请|請)?/u,'').replace(/(?:一下吧|一下|吧|呀|吗|嗎|好不好)$/u,'');
   found=[
    ['stop',/^(?:停下|停止(?:跑步|走路|移动|移動)?|休息|别动|別動)$/u],
    ['home',/^(?:回来|回來|回去|归位|歸位|回家)$/u],
    ['come',/^(?:过来|過來|来这里|來這裡|到我这|到我這|过来陪我|過來陪我)$/u],
    ['walk',/^(?:走|走一走|走走|散步|陪我散步|一起散步)$/u],
    ['run',/^(?:跑|跑步|跑一跑|跑快点|跑快點)$/u],
    ['wag',/^(?:摇尾巴|搖尾巴|摇尾|搖尾|摆尾|擺尾)$/u],
    ['jump',/^(?:跳|跳一跳|跳高)$/u]
   ].find(([,pattern])=>pattern.test(zh))?.[0];
  }
  if(!found&&postures)found=[
   ['sit',/^(?:sit(?: down)?|assis|assieds-toi|坐下|坐下来|坐下來)(?:吧|呀)?$/u],
   ['lie',/^(?:lie down|lay down|down|couché|couche-toi|趴下|趴下来|趴下來|躺下)(?:吧|呀)?$/u],
   ['stand',/^(?:stand(?: up)?|debout|lève-toi|起来|起來|站起来|站起來|站好)(?:吧|呀)?$/u]
  ].find(([,pattern])=>pattern.test(clause.replace(/^(?:请你|請你|请|請)\s*/u,'')))?.[0];
  if(!found)found=[['come',/^viens(?: ici)?$/u],['walk',/^(?:marche|promenons-nous)$/u],['run',/^cours$/u],['jump',/^saute$/u],['stop',/^(?:arrête|reste ici|repose-toi)$/u]].find(([,pattern])=>pattern.test(clause))?.[0];
  if(found==='stop')return {action:'stop',reason:'explicit-stop',engine:'local-rules'};
  if(found){action=found;reason='supported-command';}
 }
 return {action,reason,engine:'local-rules'};
}
export function parseCommand(input, options) {return explainCommand(input, options).action;}
