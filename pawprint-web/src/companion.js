import {parseCommand} from './commands.js';
// Local deterministic dialogue. This is not an LLM or translation of animal emotions.
export function respond(text,language='zh',name='Lanlao',kind='dog',{useInterfaceLanguage=false}={}){
 const lang=useInterfaceLanguage?(language==='fr'?'fr':language==='en'?'en':'zh'):/[\u3400-\u9fff]/.test(text)?'zh':/\b(bonjour|bonsoir|merci|comment|pourquoi|salut|viens|marche|cours|saute|chien|chat|avec|moi)\b|[éèêëàâùûçœ]/i.test(text)?'fr':/[a-z]/i.test(text)?'en':language==='fr'?'fr':language==='en'?'en':'zh';
 const action=parseCommand(text);
 const lines={
  zh:{come:'主人，我来啦！🐾',home:'好，我回到这里等你。',walk:'一起慢慢走吧。',run:'出发！追上我呀 ✨',wag:'见到你就很开心！',jump:'看我跳一下！',stop:'好，我乖乖陪着你。',hello:`主人你好！我是${name}，见到你真开心 🐾`,love:'嘿嘿，再陪我玩一会儿吧。',sad:'我就在这里，陪着你。',other:'我歪着头听呢。你想聊什么？'},
  en:{come:'Coming over.',home:'I’ll wait for you here.',walk:'Let’s take the scenic route.',run:'Zoomies! Catch me if you can ✨',wag:'You make my tail so happy.',jump:'Watch this little leap!',stop:'I’ll rest right beside you.',hello:`Hi! I’m ${name}. Want to play? 🐾`,love:'Oh, you’re making my tail wag.',sad:'I’m right here with you.',other:'I’m listening with my head tilted. Tell me more!'},
  fr:{come:'J’arrive, mon cher maître ! 🐾',home:'Je t’attends ici.',walk:'Promenons-nous doucement.',run:'On fait la course ! ✨',wag:'Ma queue ne tient plus en place !',jump:'Regarde mon petit saut !',stop:'Je reste près de toi.',hello:`Coucou, mon cher maître ! Je suis ${name}. On joue ? 🐾`,love:'Tu me rends tellement heureuse !',sad:'Je suis là, tout près de toi.',other:'Je t’écoute. Raconte-moi !'}
 }[lang];
 const sound=value=>kind==='cat'?null:value;
 if(action)return {action,caption:lines[action],sound:sound(action==='stop'?null:action==='run'?'panting':action==='wag'?'happy-double':'greeting')};
 if(/你好|嗨|早安|晚安|hello|hi\b|bonjour|salut/i.test(text))return {action:null,caption:lines.hello,sound:sound('greeting')};
 if(/可爱|可愛|喜欢你|喜歡你|乖|爱你|愛你|love|cute|adore/i.test(text))return {action:null,caption:lines.love,sound:sound('happy-double')};
 if(/难过|難過|伤心|傷心|累|孤独|孤獨|sad|lonely|triste/i.test(text))return {action:null,caption:lines.sad,sound:sound('attention')};
 return {action:null,caption:lines.other,sound:sound('sniffing')};
}
