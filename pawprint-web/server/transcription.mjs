export function createTranscription({apiKey,fetchImpl=fetch,model='gpt-transcribe'}){
 return async ({bytes,mime,language,signal})=>{
  const form=new FormData();
  form.append('file',new Blob([bytes],{type:mime}),mime==='audio/mp4'?'speech.m4a':'speech.webm');
  form.append('model',model);
  form.append('languages[]',language);
  const hints=language==='en'?['Lanlao','sit','walk','run','jump','come here','wag tail','stop']:language==='zh'?['蓝老','坐下','散步','跑','跳','过来','摇尾巴','停下']:['Lanlao'];
  for(const hint of hints)form.append('keywords[]',hint);
  const response=await fetchImpl('https://api.openai.com/v1/audio/transcriptions',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`},body:form,signal:AbortSignal.any([signal,AbortSignal.timeout(30000)])});
  if(!response.ok)throw Object.assign(new Error('Speech transcription unavailable.'),{status:502});
  const data=await response.json();
  if(typeof data.text!=='string'||data.text.length>1000)throw Object.assign(new Error('Invalid transcription response.'),{status:502});
  return data.text.trim();
 };
}
