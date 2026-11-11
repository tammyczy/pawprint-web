const actions=new Set(['come','home','walk','run','wag','jump','stop']);

export function createAIChat(petId=null,{fetchImpl=fetch,timeoutMs=25000}={}){
 let history=[];
 const pending=new Set();
 const chat=async (text,isCurrent=()=>true)=>{
  const controller=new AbortController();
  pending.add(controller);
  const timeout=setTimeout(()=>controller.abort(),timeoutMs);
  try{
   const response=await fetchImpl('/api/companion/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,petId,history}),signal:controller.signal});
   const result=await response.json();
   if(!response.ok)throw Object.assign(new Error(result?.error||'Conversation is temporarily unavailable.'),{status:response.status});
   if(typeof result?.caption!=='string'||!result.caption.trim()||result.caption.length>500||(result.action!=null&&!actions.has(result.action)))throw new Error('The conversation service returned an invalid reply.');
   // A server-authored notice is not a model-generated pet reply.
   if(isCurrent()&&!['system-privacy','system-action'].includes(result.source))history=[...history,{role:'user',content:text},{role:'assistant',content:result.caption}].slice(-10);
   return result;
  }finally{clearTimeout(timeout);pending.delete(controller);}
 };
 // An explicit control may supersede a pending reply without waiting for the
 // network. The caller still owns the revision check for late responses.
 chat.cancel=()=>{for(const controller of pending)controller.abort();};
 return chat;
}
