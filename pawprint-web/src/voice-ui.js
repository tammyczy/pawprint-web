import './voice-ui.css';
import {createSpeechPlayer} from './voice-player.js';
const copy={
 en:{title:'Lanlao’s voice',voice:'Choose a voice',coral:'Coral · Warm & playful',nova:'Nova · Bright & friendly',shimmer:'Shimmer · Soft & gentle',marin:'Marin · Clear & expressive',preview:'Preview voice',stop:'Stop audio',replay:'Replay reply',auto:'Read replies aloud',disclosure:'AI-generated voice. Your words and replies are processed by OpenAI.',idle:'Ready to speak with you.',preparing:'Preparing his voice…',speaking:'Speaking…',blocked:'Tap Replay reply to let your browser play the voice.',error:'Voice could not play.',unavailable:'Voice is unavailable. Please reconnect to the local service.',sample:'Hi, I’m your little companion. I’m right here with you. What would you like to talk about today?'},
 zh:{title:'蓝老的声音',voice:'选择声音',coral:'Coral · 温暖俏皮',nova:'Nova · 明亮活泼',shimmer:'Shimmer · 轻柔温和',marin:'Marin · 清晰自然',preview:'试听声音',stop:'停止播放',replay:'重听回复',auto:'自动朗读回复',disclosure:'声音由 AI 生成。你的话语及回复会由 OpenAI 处理。',idle:'准备好陪你说话了。',preparing:'正在准备声音…',speaking:'正在说话…',blocked:'点击“重听回复”，让浏览器播放声音。',error:'声音未能播放。',unavailable:'语音暂不可用，请检查本机服务。',sample:'主人你好，我来啦。我就在这里陪着你，今天想和我聊点什么？'},
 fr:{title:'La voix de Lanlao',voice:'Choisir une voix',coral:'Coral · Chaleureuse et enjouée',nova:'Nova · Vive et amicale',shimmer:'Shimmer · Douce et calme',marin:'Marin · Claire et expressive',preview:'Écouter la voix',stop:'Arrêter',replay:'Réécouter la réponse',auto:'Lire les réponses à voix haute',disclosure:'Voix générée par IA. Vos messages et réponses sont traités par OpenAI.',idle:'Prête à vous parler.',preparing:'Préparation de la voix…',speaking:'Elle parle…',blocked:'Appuyez sur Réécouter pour autoriser la lecture.',error:'Lecture de la voix impossible.',unavailable:'Voix indisponible. Vérifiez le service local.',sample:'Bonjour, je suis votre petite compagne. Je suis là pour vous. De quoi voulez-vous parler aujourd’hui ?'}
};
const toneCopy={en:{label:'Speaking style',natural:'Warm conversation',cheerful:'Playful & lively',comfort:'Gentle reassurance',sample:'Oh, you’re here! I was just wondering when I’d see you. Come sit with me for a little while. I’m listening.'},zh:{label:'说话语气',natural:'自然陪伴',cheerful:'开心俏皮',comfort:'温柔安慰',sample:'你来啦！我刚刚还在想，今天会不会见到你。先坐一会儿吧，慢慢说，我听着呢。'},fr:{label:'Ton de la voix',natural:'Conversation chaleureuse',cheerful:'Enjouée et vive',comfort:'Douce et rassurante',sample:'Ah, te voilà ! Je me demandais quand je te verrais. Viens t’asseoir un moment avec moi. Je t’écoute.'}};
Object.assign(copy.en,{verse:'Verse · Bright & boyish',ash:'Ash · Easygoing male voice',title:'Lanlao’s voice',preparing:'Preparing his voice…'});
Object.assign(copy.zh,{verse:'Verse · 明亮少年感',ash:'Ash · 轻快男声',title:'蓝老的声音'});
Object.assign(copy.fr,{verse:'Verse · Jeune et enjouée',ash:'Ash · Masculine et détendue',title:'La voix de Lanlao',speaking:'Il parle…'});
toneCopy.zh.sample='嘿，主人！蓝老来啦！今天想怎么玩？你说，我听着！';
toneCopy.en.sample='Hey, you’re here! It’s me, Lanlao! What shall we play today? Tell me, I’m listening!';
toneCopy.fr.sample='Hé, te voilà ! C’est moi, Lanlao ! On joue à quoi aujourd’hui ? Je t’écoute !';

export function createVoicePanel({container,locale=()=> 'en',beforeSpeak=()=>{},title=null}){
 const root=document.createElement('section');root.className='companion-voice';root.setAttribute('aria-label','Companion voice');
 const heading=document.createElement('h3');const label=document.createElement('label');const labelText=document.createElement('span');
 const select=document.createElement('select');select.className='companion-voice-select';
 const voiceIds=['verse','ash','coral','nova','shimmer','marin'];
 for(const id of voiceIds){const option=document.createElement('option');option.value=id;select.append(option);}
 let voice=localStorage.getItem('pawprint-voice')||'verse';if(!voiceIds.includes(voice))voice='verse';select.value=voice;
 label.append(labelText,select);
 const toneLabel=document.createElement('label'),toneText=document.createElement('span'),toneSelect=document.createElement('select');toneSelect.className='companion-tone-select';
 for(const id of ['natural','cheerful','comfort']){const option=document.createElement('option');option.value=id;toneSelect.append(option);}
 let tone=localStorage.getItem('pawprint-tone')||'natural';if(!['natural','cheerful','comfort'].includes(tone))tone='natural';toneSelect.value=tone;toneLabel.append(toneText,toneSelect);
 const actions=document.createElement('div');actions.className='voice-actions';
 const preview=document.createElement('button'),replay=document.createElement('button'),stop=document.createElement('button');
 for(const button of [preview,replay,stop]){button.type='button';actions.append(button);}
 const toggleLabel=document.createElement('label');toggleLabel.className='voice-auto';const toggle=document.createElement('input');toggle.type='checkbox';toggle.checked=localStorage.getItem('pawprint-voice-enabled')!=='false';const toggleText=document.createElement('span');toggleLabel.append(toggle,toggleText);
 const status=document.createElement('p');status.className='voice-playback-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const disclosure=document.createElement('small');const audio=document.createElement('audio');audio.preload='auto';audio.hidden=true;
 root.append(heading,label,toneLabel,actions,toggleLabel,status,disclosure,audio);container.append(root);
 let available=true,lastReply='',state='idle',detail='';
 const words=()=>copy[locale()]||copy.en;
 function render(){const c=words(),t=toneCopy[locale()]||toneCopy.en;heading.textContent=title||c.title;labelText.textContent=c.voice;select.setAttribute('aria-label',c.voice);toneText.textContent=t.label;toneSelect.setAttribute('aria-label',t.label);for(const option of select.options)option.textContent=c[option.value];for(const option of toneSelect.options)option.textContent=t[option.value];preview.textContent=c.preview;replay.textContent=c.replay;stop.textContent=c.stop;toggleText.textContent=c.auto;disclosure.textContent=c.disclosure;status.textContent=(available?c[state]:c.unavailable)+(state==='error'&&detail?' '+detail:'');root.dataset.state=state;preview.disabled=!available;replay.disabled=!available||!lastReply;stop.disabled=!['preparing','speaking','blocked'].includes(state);}
 const player=createSpeechPlayer({audio,onState:(next,error='')=>{state=next;detail=error;render();}});
 async function say(text,force=false){if(!text.trim()||!available||(!force&&!toggle.checked))return false;beforeSpeak();return player.speak(text,voice,tone);}
 preview.onclick=()=>{const sample=title?(locale()==='zh'?`嘿，主人！${title}来啦！今天想怎么玩？你说，我听着！`:locale()==='fr'?`Hé, te voilà ! C’est moi, ${title} ! On joue à quoi aujourd’hui ? Je t’écoute !`:`Hey, you’re here! It’s me, ${title}! What shall we play today? Tell me, I’m listening!`):(toneCopy[locale()]||toneCopy.en).sample;if(!lastReply)lastReply=sample;render();void say(sample,true);};
 replay.onclick=()=>void say(lastReply,true);stop.onclick=()=>player.stop();
 select.onchange=()=>{player.stop();voice=select.value;localStorage.setItem('pawprint-voice',voice);};
 toneSelect.onchange=()=>{player.stop();tone=toneSelect.value;localStorage.setItem('pawprint-tone',tone);};
 toggle.onchange=()=>{localStorage.setItem('pawprint-voice-enabled',String(toggle.checked));if(!toggle.checked)player.stop();};
 document.addEventListener('visibilitychange',()=>{if(document.hidden)player.stop();});window.addEventListener('pagehide',()=>player.stop());
 render();
 return {speak(text){lastReply=text;render();return say(text);},stop:()=>player.stop(),render,setAvailable(value){available=!!value;if(!available)player.stop();render();}};
}
