// Speech recognition rarely spells an invented name correctly: "Lanlao" comes
// back as "Lan Lao", "land low", "兰老" and so on. Every later step expects the
// exact name before a command, so a misheard name used to turn "Lanlao, come
// here" into an unrecognized sentence. Only a leading, name-like sound is
// rewritten; the rest of the utterance, including any negation, is untouched.
const latin=/^(?:hey\s+|hi\s+|ok(?:ay)?\s+)?(?:l|bl|pl)(?:a|e|u|o)(?:n|nd|ng|hn|m)[\s-]*(?:l|n)(?:ao|au|ow|ou|aw|o|oud|ough|a|ow's|o's)\b[\s,.:!]*/iu;
// Common words such as 男老师 or 懒老公 are not the name.
const chinese=/^[蓝藍兰蘭懒懶烂爛篮籃拦攔澜瀾览覽岚嵐][老佬姥劳勞牢唠嘮捞撈](?![师師板公婆人家年实實])[\s,，:：。!！]*/u;
export function normalizeSpokenName(text){
 if(typeof text!=='string')return text;
 const value=text.trim();
 if(/^(?:lanlao|蓝老|藍老)(?:[\s,，:：]|$)/iu.test(value))return value;
 const zh=value.match(chinese);
 if(zh)return value.length===zh[0].length?'蓝老':`蓝老，${value.slice(zh[0].length)}`;
 const en=value.match(latin);
 if(en)return value.length===en[0].length?'Lanlao':`Lanlao, ${value.slice(en[0].length)}`;
 return value;
}
