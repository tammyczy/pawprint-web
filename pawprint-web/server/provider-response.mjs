// Bound provider responses while streaming, including the time spent reading the body.
export async function readProviderBody(response,{maxBytes,signal}){
 if(signal?.aborted)throw signal.reason;
 if(Number(response.headers.get('content-length'))>maxBytes){await response.body?.cancel();throw new Error('PROVIDER_BODY_TOO_LARGE');}
 if(!response.body)throw new Error('PROVIDER_BODY_MISSING');
 const reader=response.body.getReader(),chunks=[];let size=0,completed=false,onAbort;
 const aborted=new Promise((resolve,reject)=>{
  onAbort=()=>reject(signal.reason||new DOMException('Aborted','AbortError'));
  signal?.addEventListener('abort',onAbort,{once:true});
  if(signal?.aborted)onAbort();
 });
 try{
  while(true){
   const {done,value}=await Promise.race([reader.read(),aborted]);
   if(done){completed=true;break;}
   size+=value.byteLength;if(size>maxBytes)throw new Error('PROVIDER_BODY_TOO_LARGE');
   chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks,size);
 }finally{
  signal?.removeEventListener('abort',onAbort);
  if(!completed)await reader.cancel().catch(()=>{});
  reader.releaseLock();
 }
}
