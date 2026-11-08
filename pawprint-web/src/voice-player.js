export function createSpeechPlayer({audio,fetchImpl=fetch,createURL=URL.createObjectURL,revokeURL=URL.revokeObjectURL,onState=()=>{},timeoutMs=35000}){
 let revision=0,request=null,url=null;
 const cache=new Map();
 function stop(notify=true){
  revision++;request?.abort();request=null;audio.pause();audio.onended=null;audio.onerror=null;
  audio.removeAttribute('src');audio.load();if(url){revokeURL(url);url=null;}
  if(notify)onState('idle');
 }
 async function speak(text,voice,tone='natural'){
  stop(false);const token=revision;request=new AbortController();onState('preparing');
  let timedOut=false;
  const pendingRequest=request;
  const timeout=setTimeout(()=>{timedOut=true;pendingRequest.abort();},timeoutMs);
  try{
   const key=voice+'\n'+tone+'\n'+text;let blob=cache.get(key);
   if(!blob){
    const response=await fetchImpl('/api/companion/speech',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,voice,tone}),signal:request.signal});
    if(!response.ok){const error=await response.json();throw new Error(error.error||'Voice generation failed.');}
    if(!(response.headers.get('content-type')||'').startsWith('audio/'))throw new Error('Voice service did not return audio.');
    blob=await response.blob();if(!blob.size)throw new Error('Voice service returned empty audio.');
    if(token!==revision)return false;
    cache.set(key,blob);if(cache.size>6)cache.delete(cache.keys().next().value);
   }
   if(token!==revision)return false;
   clearTimeout(timeout);url=createURL(blob);audio.src=url;
   audio.onended=()=>{if(token===revision)onState('idle');};
   audio.onerror=()=>{if(token===revision)onState('error','Your browser could not play this reply. Try again.');};
   await audio.play();if(token!==revision){return false;}onState('speaking');return true;
  }catch(error){
   if(token!==revision||(!timedOut&&error.name==='AbortError'))return false;
   onState(error.name==='NotAllowedError'?'blocked':'error',timedOut?'Voice generation took too long. Please try again.':error.message);return false;
  }finally{clearTimeout(timeout);if(token===revision)request=null;}
 }
 return {speak,stop};
}
