// Only unambiguous, whole-utterance controls may bypass the AI request. Other
// language and compound sentences keep their usual conservative path.
export function isImmediateStop(text,name=''){
 if(typeof text!=='string')return false;
 const value=text.normalize('NFKC').toLowerCase().replace(/[’‘]/g,"'").trim()
  .replace(/^(?:lanlao|蓝老|藍老)[\s:：,，]+/u,'')
  .replace(/^(?:蓝老|藍老)(?=(?:现在|現在|马上|馬上|请|請|停|不要|别|別|休息))/u,'')
  .replace(name&&String(name).length<=30?new RegExp(`^${String(name).normalize('NFKC').toLowerCase().replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}[\\s:：,，]+`,'u'):/$^/u,'')
  .replace(/[.。!！?？]+$/u,'').trim();
 const zh=/^(?:(?:现在|現在|马上|馬上)\s*)?(?:(?:请|請)(?:你)?\s*)?(?:(?:现在|現在|马上|馬上)\s*)?(?:停下|停下来|停下來|停止|停止移动|停止移動|停止走动|停止走動|停止跑步|停止走路|休息|不要动|不要動|别动|別動)(?:吧|呀|好吗|好嗎)?$/u;
 const en=/^(?:(?:please\s+)?(?:could|can|would) you\s+|please\s+)?(?:stop(?: moving| walking| running| jumping)?|rest|freeze|stay still|(?:don't|do not) (?:move|run|walk|jump))(?: please| now)?$/u;
 const fr=/^(?:(?:s'il te plaît|s'il vous plaît|s'il te plait|s'il vous plait)\s*,?\s+)?(?:(?:est-ce que\s+)?(?:peux-tu|pourrais-tu|tu peux|tu pourrais)\s+(?:t'arrêter(?: de (?:bouger|courir|marcher|sauter))?|t'arreter(?: de (?:bouger|courir|marcher|sauter))?|(?:arrêter|arreter|cesser|stopper) (?:de (?:bouger|courir|marcher|sauter)|(?:tous )?(?:tes|les) mouvements(?: de ton corps)?))|(?:je (?:voudrais|souhaite)|j'aimerais) que tu (?:arrêtes|arretes|cesses) de (?:bouger|courir|marcher|sauter)|je te demande de ne plus bouger|arrête(?:-toi)?|arrete(?:-toi)?|arrête de (?:bouger|courir|marcher|sauter)|arrete de (?:bouger|courir|marcher|sauter)|cesse (?:de (?:bouger|courir|marcher|sauter)|(?:tous )?tes mouvements)|ne bouge (?:(?:absolument|vraiment) )?(?:pas|plus)|reste (?:(?:parfaitement|bien) )?(?:immobile|ici sans bouger))(?:\s*,?\s+(?:s'il te plaît|s'il vous plaît|s'il te plait|s'il vous plait|maintenant|tout de suite|merci))?$/u;
 return zh.test(value)||en.test(value)||fr.test(value);
}
