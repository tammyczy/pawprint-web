const actions=new Set(['come','home','walk','run','wag','jump','stop']);

export function createAIChat(petId=null,{fetchImpl=fetch,timeoutMs=25000}={}){
 let history=[];
 return async text=>{
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),timeoutMs);
  try{
   const response=await fetchImpl('/api/companion/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,petId,history}),signal:controller.signal});
   const result=await response.json();
   if(!response.ok)throw new Error(result?.error||'Conversation is temporarily unavailable.');
   if(typeof result?.caption!=='string'||!result.caption.trim()||result.caption.length>500||(result.action!=null&&!actions.has(result.action)))throw new Error('The conversation service returned an invalid reply.');
   history=[...history,{role:'user',content:text},{role:'assistant',content:result.caption}].slice(-10);
   return result;
  }finally{clearTimeout(timeout);}
 };
}
