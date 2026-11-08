import {detectReplyLanguage} from './companion-ai.mjs';
import {readProviderBody} from './provider-response.mjs';

export const SPEECH_VOICES=['verse','ash','coral','nova','shimmer','marin'];
export const SPEECH_TONES=['natural','cheerful','comfort'];
const styles={verse:'youthful, bright, boyish, curious, and playfully expressive',ash:'youthful, easygoing, friendly, and lightly mischievous',coral:'warm, affectionate, relaxed, and gently playful',nova:'bright, friendly, and lively',shimmer:'soft, calm, and reassuring',marin:'clear, intimate, and expressive'};

export function speechInstructions(text,voice,tone='natural'){
 const comforting=tone==='comfort'||(tone==='natural'&&/难过|伤心|累了|难受|不开心|慢慢来|sad|upset|tired|sorry|triste|fatigu/i.test(text));
 const character=['verse','ash'].includes(voice)?'a youthful masculine voice with a light, boyish register. The character is a male puppy: small, eager, friendly and curious. Keep him playful and emotionally present, without a heavy mature delivery or a cartoon squeak':'a natural feminine voice';
 const feeling=comforting?'Tender reassurance: warm and present, a gentler pace, brief thoughtful pauses, an encouraging lift at the end. Keep the voice alive and engaged rather than whispering or flattening it.':tone==='cheerful'?'Happy to see a close friend: an audible smile, lively pitch changes, playful energy, quick light openings and a relaxed finish.':'Warmly happy to see a close friend: a subtle audible smile, expressive rises and falls, natural emphasis on meaningful words, and varied conversational pacing. Let questions sound curious and greetings sound delighted.';
 return `Perform this as a spontaneous, one-to-one conversation in ${detectReplyLanguage(text)}, using ${character}, with a personality that is ${styles[voice]}. ${feeling} Convey the emotional meaning of each sentence instead of reading every phrase with the same intonation. Use tiny natural pauses between thoughts. Speak the supplied words exactly, without extra words, animal sounds or stage directions. Avoid presenter delivery, customer-service politeness, stiff reading, exaggerated baby talk and breathy ASMR. For Chinese: 使用流利的普通话，像和熟悉的人面对面聊天。咬字自然，句尾有轻微语气变化，避免播音腔、逐字念稿和刻意的气声；开心的句子带一点笑意，安慰的句子柔和但不拖沓。`;
}

export function createCompanionSpeech({apiKey,model='gpt-4o-mini-tts',fetchImpl=fetch,timeoutMs=30000}={}){
 return async({text,voice='verse',tone='natural',signal})=>{
  if(!apiKey)throw Object.assign(new Error('Voice is unavailable: the OpenAI key is not configured.'),{status:503});
  if(typeof text!=='string'||!text.trim()||text.length>500||!SPEECH_VOICES.includes(voice)||!SPEECH_TONES.includes(tone))throw Object.assign(new Error('Invalid speech text, voice or tone.'),{status:400});
  const abort=AbortSignal.any([AbortSignal.timeout(timeoutMs),...(signal?[signal]:[])]);
  let response,audio;
  try{
   response=await fetchImpl('https://api.openai.com/v1/audio/speech',{method:'POST',redirect:'error',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},signal:abort,body:JSON.stringify({model,voice,input:text,response_format:'mp3',speed:comfortSpeed(tone),instructions:speechInstructions(text,voice,tone)})});
   if(response.ok)audio=await readProviderBody(response,{maxBytes:5*1024*1024,signal:abort});
  }catch(error){
   if(signal?.aborted)throw error;
   throw Object.assign(new Error(abort.aborted?'Voice generation timed out. Try again.':'Could not connect to voice generation. Try again.'),{status:502});
  }
  if(!response.ok)throw Object.assign(new Error(response.status===429?'Voice service is busy. Please try again shortly.':response.status===401?'Voice service could not authenticate.':'Voice generation is temporarily unavailable.'),{status:response.status===429?429:502});
  if(!audio.length)throw Object.assign(new Error('Voice service returned invalid audio.'),{status:502});
  return audio;
 };
}
function comfortSpeed(tone){return tone==='comfort'?0.96:tone==='cheerful'?1.03:1;}
