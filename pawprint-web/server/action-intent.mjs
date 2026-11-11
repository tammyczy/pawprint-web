// A bounded, conservative recognition layer for explicit movement requests.
// It does not attempt unrestricted sentiment or natural language understanding.
// Verbs and request frames are intentionally separate so ordinary discussion
// containing an action word cannot by itself authorize motion.
const frames={
 zh:/(?:^(?:(?:现在|現在|马上|馬上|先)\s*)?(?:(?:请|請)(?:你)?|你能不能|你能|你可以|能不能|可不可以|可以)?|[,，;；。.!！?？]\s*(?:(?:现在|現在|马上|馬上)\s*)?(?:(?:请|請)(?:你)?|你能不能|你能|你可以|能不能|可不可以|可以))\s*(?:(?:现在|現在|马上|馬上|慢慢|快快|轻轻|輕輕|再|先|向我|在原地|在这里|在這裡)\s*)?(?:过来|過來|靠近|回到|回去|走(?!的)|跑(?!步?的|得)|摇|搖|摆|擺|跳(?!跃的|躍的|的)|停|到我|(?:让|讓)我(?:看|瞧)|(?:我们|我們)一起(?:走|散步))/u,
 en:/^(?:(?:please\s+)?(?:(?:could|can|would|will)\s+you\s+(?:please\s+)?)?(?:come(?!\s+to\s+(?:a|the|think)\b)|approach|return|go\s+back|walk(?!\s+me\s+through)|take\s+(?:a\s+)?(?:(?:slow|little|short)\s+)?(?:walk|stroll)|stroll|start\s+(?:running|walking)|run(?!\s+(?:a|an|the|some)\b)|sprint|give\s+(?:your|the)\s+tail|wag|do\s+(?:one|a|the)\s+jump|jump(?!\s+to\b)|leap|stop(?!\s+(?:talking|speaking|telling|saying)\b)|stay\s+still|make\s+your\s+way|show\s+me\s+(?:how\s+fast\s+you\s+can\s+go|(?:a|your)\s+(?:(?:quick|little)\s+)?(?:sprint|jump)))\b|let(?:'s| us)\s+(?:walk|go|stretch|get)\b|first\s+(?:wag|walk|jump|run|stop)\b)/u,
 fr:/^(?:(?:pourrais-tu|peux-tu|tu peux|tu pourrais|tu veux bien)\s+(?:(?:me|te|nous)\s+)?(?:venir|approcher|rentrer|marcher|courir|sauter|remuer|arrêter|faire\s+(?:un|une)\s+(?:(?:petit|petite)\s+)?saut|montrer\s+(?:un|une)\s+(?:(?:petit|petite)\s+)?(?:sprint|saut))\b|tu veux venir\s+(?:tout\s+)?près de moi\b|avance\s+(?:(?:lentement|doucement)\s+)?vers moi\b|approche|viens|venir|retourne|reviens|rentre|marche(?!\s+à\s+suivre)|promenons|mets-toi|cours|remue|fais\s+(?:(?:un|une)\s+(?:(?:petit|petite)\s+)?saut|(?:un|deux|trois|quatre|quelques)\s+pas\s+(?:vers|en avant|sur place))|saute|arrête|arrete|reste|dégourdissons|degourdissons)\b/u
};
const lexemes=[
 ['stop',/(?:停止(?:移动|移動|走|跑|跳|动作|動作|运动|運動|$)|停下|停住|停一停|别动|別動|不要动|不要動|\bstop(?:ping)?\b|stay\s+still|\barrête(?:-toi)?\b|\barrete(?:-toi)?\b|\barrêter\s+de\s+(?:bouger|marcher|courir|sauter)\b|\breste\s+(?:ici\s+)?sans\s+bouger\b)/gu],
 ['home',/(?:回(?:到|去|来|來|家|原位)|\breturn\b|\bgo\s+back\b|\bretourne\b|\breviens\b|\brentr(?:e|er)\b)/gu],
 ['come',/(?:过来|過來|靠近|走到(?:我|这|這)|到我.{0,10}(?:来|來|旁边|旁邊)|\b(?:come|approach)\b|\b(?:make|making)\b.{0,25}\b(?:over|beside)\b|\bapproche(?:-toi)?\b|\bviens\b|\bvenir\b|\bavance\s+(?:(?:lentement|doucement)\s+)?vers moi\b)/gu],
 ['walk',/(?:散步|走一走|走走|慢慢走|\b(?:walk|walking|stroll|strolling)\b|\bstretch\b.{0,20}\blegs\b|\bmarch(?:e|er)\b|\bpromen(?:ade|ons|er)\b|\bdégourdissons\b|\bdegourdissons\b|\bfais\s+(?:un|deux|trois|quatre|quelques)\s+pas\s+(?:vers|en avant|sur place)\b)/gu],
 ['run',/(?:跑|\b(?:run|running|sprint|sprinting)\b|\bcour(?:s|ir)\b|\bsprint\b)/gu],
 ['wag',/(?:(?:摇|搖|摆|擺).{0,8}尾|尾巴.{0,8}(?:摇|搖|摆|擺)|\bwag(?:ging)?\b|\bremue\b.{0,20}\bqueue\b)/gu],
 ['jump',/(?:跳|\b(?:jump|leap)\b|\bsaut(?:e|er)?\b)/gu]
];

export function isDiscussionText(value){
 // Words such as stop and walk also describe controlling audio, thinking or
 // explaining a process. These are not requests to move the companion.
 if(/\bstop\s+(?:(?:the|your|my|this|that)\s+)?(?:[a-z]+\s+){0,2}(?:music|audio|sound|song|video|playback|thinking|talking|speaking|telling|saying)\b|\bwalk\s+(?:(?:me|us)\s+)?through\b|\barrête\s+(?:la|le|les)\s+(?:musique|vidéo|audio|son)\b/u.test(value))return true;
 // “Jump over” can mean skipping arbitrary content, which this animation
 // cannot represent; “run through” can mean reviewing something. Abstain.
 // For a stop followed by an object, authorize it only when the complement
 // explicitly describes physical motion or a short timing phrase.
 if(/跳(?:过|過)|\brun\s+through\b|\bstop(?:ping)?\s+(?!(?:moving|running|walking|jumping|wagging|everything|now|here|please|for\s+(?:a|one)\s+(?:moment|second)|right\s+(?:now|there)|and)\b)[a-z]|停下(?!(?:来|來|脚|腳|动作|動作|移动|移動|运动|運動|跑|走|跳|再|然后|然後|吧|呀|啊|啦|了|一下|[，。！？\s]|$))[\u3400-\u9fff]|\barrête\s+(?!(?:de\s+(?:bouger|marcher|courir|sauter)|(?:tes|vos|les)\s+(?:(?:petits|petites)\s+)?(?:pas|mouvements?)|toi|ici|maintenant|un\s+instant|et)\b)[a-zà-ÿ]/u.test(value))return true;
 if(/(?:跳过|跳過).{0,12}(?:歌|音乐|音樂|视频|視頻|广告|廣告|片段)|(?:没|沒|未)(?:有)?(?:让|讓|叫|要求)(?:你|他|她)|\brun\s+(?:(?:the|a|an|this|that|some)\s+)?(?:software|code|program|app|application|test|script|process)\b/u.test(value))return true;
 // French “sauter” can refer to skipping text or jumping to a conclusion,
 // rather than asking the pet to jump. This intentionally abstains on such
 // content-navigation wording, even if a model proposes an animation.
 if(/\bsaut(?:e|er|ez|ons)\s+(?:(?:directement|rapidement|vite)\s+)?(?:(?:à|au|aux|vers|dans|jusqu'à|jusqu'au|jusqu'aux)\s+)?(?:(?:la|le|les|une|un|des)\s+)?(?:(?:premi(?:er|ère)|deuxième|deuxieme|derni(?:er|ère))\s+)?(?:conclusion|fin|page|chapitre|titre|question|section|paragraphe|résultat|resultat|étape|etape|ligne)s?\b|^cours\s+(?:de|d')\s*(?:français|anglais|maths?|musique|danse|physique|chimie|biologie|langue|géographie|geographie|histoire)\b|^marche\s+(?:de|pour)\s+(?:la\s+)?(?:paix|solidarité|solidarite|liberté|liberte|manifestation|protestation)\b/u.test(value))return true;
 return /(?:请问|請問|解释|解釋|讲讲|講講|说说|說說|告诉我|告訴我|记得|記得|想念|我觉得|我覺得|对于|對於|过去|過去|的(?:那|这|這|狗|猫|貓)|照片|画面|畫面|最喜欢|最喜歡|是(?:表示|什么|什麼|我)|(?:妈妈|媽媽|老师|老師|朋友|他|她).{0,12}(?:说|說|让|讓)|\btell me\b|\bdescribe\b|\bdiscuss\b|\bimagine\b|\bremember\b|\bsing\b|\bdo you think\b|\brun\s+(?:out\s+of|(?:your|my|his|her)\s+eyes)\b|\bexplique\b|\bparle(?:r|-moi)\b|\braconte\b|\bsouviens\b)/u.test(value);
}
export function recognizeFramedAction(text){
 const value=String(text??'').trim().replace(/[.!！?？。]+$/u,'').trim();
 // Requests to describe or discuss behavior are not requests to move.
 if(isDiscussionText(value))return null;
 if(!Object.values(frames).some(frame=>frame.test(value)))return null;
 // "Reviens près de moi" requests proximity, whereas a return to a place or
 // basket continues to map to home. Avoid interpreting an arbitrary return
 // elsewhere as an approach.
 if(/^reviens\s+(?:tout\s+)?(?:près de moi|vers moi)\b/u.test(value))return 'come';
 let latest=null;
 for(const [action,pattern] of lexemes){
  pattern.lastIndex=0;
  for(const match of value.matchAll(pattern)){
   if(action==='stop')return 'stop';
   if(!latest||match.index>latest.index)latest={action,index:match.index};
  }
 }
 return latest?.action??null;
}
