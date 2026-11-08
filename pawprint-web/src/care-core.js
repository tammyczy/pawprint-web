// Pure grief-care logic shared by the pages and tests: distress detection, copy, goodbye records, break timing.

export const HELPLINE_URL='https://findahelpline.com';
export const BREAK_AFTER_MS=20*60*1000;

const patterns=[
 /\b(kill(ing)?\s+myself|suicid\w*|end(ing)?\s+(my|it)\s+(life|all)|want(ed)?\s+to\s+die|wanna\s+die|don'?t\s+want\s+to\s+(live|be\s+alive|exist)|no\s+reason\s+to\s+live|hurt(ing)?\s+myself|self[-\s]?harm|cut(ting)?\s+myself|better\s+off\s+dead|can'?t\s+go\s+on)\b/i,
 /想死|不想活|活不下去|自杀|自殺|轻生|輕生|结束(我的)?生命|結束(我的)?生命|伤害自己|傷害自己|割腕|死了算了/,
 /\b(me\s+suicider|suicide|me\s+tuer|envie\s+de\s+mourir|veux\s+mourir|en\s+finir|plus\s+envie\s+de\s+vivre|me\s+faire\s+du\s+mal)\b/i
];

export function detectDistress(text){
 const value=String(text||'');
 return patterns.some(pattern=>pattern.test(value))?'crisis':null;
}

export const careCopy={
 zh:{reply:'谢谢你愿意告诉我。我只是一个 AI 模拟，现在更需要一个真正的人陪着你。',helpTitle:'你不用一个人扛着',helpBody:'想念一个深爱的伙伴，有时会让人喘不过气。请和你信任的人说说，比如家人、老师或朋友。Pawprint 是 AI 模拟，可能无法识别所有求助信号，也不能代替专业支持。',helpUrgent:'如果你可能会伤害自己，或正处于危险中，请立刻联系当地的紧急电话。',helpLink:'查找你所在国家或地区的支持和求助热线',helpClose:'我知道了',helpOpen:'需要找人聊聊吗？',goodbyeOpen:'和 {name} 道别',goodbyeTitle:'和 {name} 道别',goodbyeIntro:'写下任何想对 {name} 说的话。信件不会发送给 AI 或服务器；想保留请下载。点击“说再见”会清空输入内容，告别日期可能保存在本机。',goodbyeLabel:'写给 {name} 的信（可不写）',goodbyeSave:'下载这封信',goodbyeConfirm:'说再见',goodbyeCancel:'还没准备好',farewellLine:'谢谢你愿意分享这个时刻。',veilTitle:'谢谢你，和 {name} 的每一段回忆。',veilBody:'你随时可以回来，但不回来也没关系。',veilStay:'再待一会儿',veilHome:'回到首页',returnBanner:'你在 {date} 和 {name} 道别过。想再来看看也没关系，不来也没关系。',returnDismiss:'好的',breakTitle:'我们已经待了一阵子了',breakBody:'要不要休息一下，或者和身边的人说说关于 {name} 的一个小故事？',breakClose:'好主意',letterHeader:'写给 {name} 的信'},
 en:{reply:'Thank you for telling me. I’m only an AI simulation, and right now you deserve a real person by your side.',helpTitle:'You don’t have to carry this alone',helpBody:'Missing someone you love can feel overwhelming. Talk to someone you trust, like a parent, teacher or friend. Pawprint is an AI simulation; it may miss signs of distress and cannot replace professional support.',helpUrgent:'If you might hurt yourself or are in danger, contact your local emergency number now.',helpLink:'Find support and helplines in your country',helpClose:'Okay',helpOpen:'Need someone to talk to?',goodbyeOpen:'Say goodbye to {name}',goodbyeTitle:'Say goodbye to {name}',goodbyeIntro:'Write anything you want to tell {name}. The letter is not sent to AI or a server; download a copy to keep it. Saying goodbye clears the text, and the date may be saved on this device.',goodbyeLabel:'Your letter to {name} (optional)',goodbyeSave:'Download letter',goodbyeConfirm:'Say goodbye',goodbyeCancel:'Not yet',farewellLine:'Thank you for sharing this moment.',veilTitle:'Thank you for every memory with {name}.',veilBody:'You can come back any time, and it’s okay not to.',veilStay:'Stay a little longer',veilHome:'Back to home page',returnBanner:'You said goodbye to {name} on {date}. It’s okay to visit again, and okay not to.',returnDismiss:'Okay',breakTitle:'We’ve spent a while together',breakBody:'Maybe take a little break, or tell someone near you a story about {name}?',breakClose:'Good idea',letterHeader:'A letter to {name}'},
 fr:{reply:'Merci de me l’avoir dit. Je ne suis qu’une simulation IA, et tu mérites maintenant une vraie personne à tes côtés.',helpTitle:'Tu n’as pas à porter cela seul',helpBody:'L’absence d’un compagnon aimé peut être écrasante. Parle à une personne de confiance : un parent, un enseignant ou un ami. Pawprint est une simulation IA ; elle peut manquer des signes de détresse et ne remplace pas un soutien professionnel.',helpUrgent:'Si tu risques de te faire du mal ou si tu es en danger, appelle tout de suite le numéro d’urgence local.',helpLink:'Trouver du soutien et des lignes d’écoute dans ton pays',helpClose:'D’accord',helpOpen:'Besoin de parler à quelqu’un ?',goodbyeOpen:'Dire au revoir à {name}',goodbyeTitle:'Dire au revoir à {name}',goodbyeIntro:'Écris ce que tu veux dire à {name}. La lettre n’est pas envoyée à une IA ni à un serveur ; télécharge une copie pour la garder. Dire au revoir efface le texte et la date peut être enregistrée sur cet appareil.',goodbyeLabel:'Ta lettre à {name} (facultatif)',goodbyeSave:'Télécharger la lettre',goodbyeConfirm:'Dire au revoir',goodbyeCancel:'Pas encore',farewellLine:'Merci d’avoir partagé ce moment.',veilTitle:'Merci pour chaque souvenir avec {name}.',veilBody:'Tu peux revenir quand tu veux, et c’est aussi normal de ne pas revenir.',veilStay:'Rester encore un peu',veilHome:'Retour à l’accueil',returnBanner:'Tu as dit au revoir à {name} le {date}. Revenir est permis, ne pas revenir aussi.',returnDismiss:'D’accord',breakTitle:'Nous avons passé un moment ensemble',breakBody:'Et si tu faisais une pause, ou racontais à quelqu’un une histoire sur {name} ?',breakClose:'Bonne idée',letterHeader:'Une lettre à {name}'}
};

export function careText(lang,key,vars={}){
 const table=careCopy[lang]||careCopy.en;
 return (table[key]??careCopy.en[key]??key).replace(/\{(\w+)\}/g,(_,name)=>vars[name]??'');
}

export function safeStorage(){
 try{const probe='__pawprint_probe__';localStorage.setItem(probe,'1');localStorage.removeItem(probe);return localStorage;}
 catch{const memory=new Map();return {getItem:k=>memory.has(k)?memory.get(k):null,setItem:(k,v)=>memory.set(k,String(v)),removeItem:k=>memory.delete(k)};}
}

export function farewellKey(petKey){return `pawprint-farewell:${String(petKey||'pet').slice(0,80)}`;}
export function readFarewell(storage,petKey){try{const value=storage.getItem(farewellKey(petKey));return value&&!Number.isNaN(Date.parse(value))?value:null;}catch{return null;}}
export function saveFarewell(storage,petKey,date){try{storage.setItem(farewellKey(petKey),date.toISOString());}catch{}}

export function createBreakTimer({now=()=>Date.now(),after=BREAK_AFTER_MS}={}){
 const start=now();let shown=false;
 return ()=>{if(shown||now()-start<after)return false;shown=true;return true;};
}
