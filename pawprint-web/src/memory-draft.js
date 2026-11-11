// Keep request state in memory only. A later edit, close, or request invalidates
// an earlier response, including when a mocked provider ignores abort signals.
export function createMemoryDraftClient({fetchImpl=fetch,timeoutMs=25000}={}){
 let revision=0,controller=null;
 function cancel(){revision++;controller?.abort();controller=null;}
 async function generate(memory,language){
  cancel();
  const text=memory.trim();
  if(!text||text.length>1200||!['zh','en','fr'].includes(language))throw new Error('invalid memory');
  const current=revision,active=new AbortController();controller=active;
  let timedOut=false;
  const timer=setTimeout(()=>{timedOut=true;active.abort();},timeoutMs);
  // The request or JSON decoder may ignore the abort signal. Race an explicit
  // abort promise so the UI still stops waiting at the timeout, and leave a
  // rejection handler attached to any request that finishes later.
  let onAbort;
  const aborted=new Promise((_,reject)=>{
   onAbort=()=>reject(new DOMException('Aborted','AbortError'));
   active.signal.addEventListener('abort',onAbort,{once:true});
  });
  try{
   const request=(async()=>{
    const response=await fetchImpl('/api/memory/draft',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({memory:text,language,consent:true}),signal:active.signal});
    if(!response.ok)throw new Error('memory draft unavailable');
    const result=await response.json();
    if(!Array.isArray(result?.sentences)||result.sentences.length<1||result.sentences.length>3||result.sentences.some(s=>typeof s?.text!=='string'||!s.text.trim()||s.text.length>600||typeof s?.source!=='string'||!s.source.trim()||!text.includes(s.source)))throw new Error('invalid memory draft');
    return result.sentences.map(s=>({text:s.text,source:s.source}));
   })();
   const result=await Promise.race([request,aborted]);
   return current===revision&&!timedOut?result:null;
  }catch(error){
   if(current!==revision)return null;
   if(timedOut)throw new Error('memory draft timed out');
   throw error;
  }finally{clearTimeout(timer);active.signal.removeEventListener('abort',onAbort);if(controller===active)controller=null;}
 }
 return {generate,cancel};
}
