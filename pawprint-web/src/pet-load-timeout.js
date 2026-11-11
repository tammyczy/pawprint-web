// Time out only stalled loads: active downloads can take longer than the limit.
// A cancelled/late loader callback is ignored after the first result.
export function loadWithIdleTimeout({start,onProgress=()=>{},timeoutMs=45000,setTimer=setTimeout,clearTimer=clearTimeout}){
 return new Promise((resolve,reject)=>{
  let settled=false,timer,abort=()=>{},lastBytes=0;
  const clear=()=>clearTimer(timer);
  const finish=(callback,value)=>{if(settled)return;settled=true;clear();callback(value);};
  const arm=()=>{clear();timer=setTimer(()=>{
   if(settled)return;
   settled=true;clear();
   try{abort();}catch{}
   reject(Object.assign(new Error('MODEL_LOAD_STALLED'),{code:'MODEL_LOAD_STALLED'}));
  },timeoutMs);};
  arm();
  try{
   const cancel=start(
    value=>finish(resolve,value),
    event=>{if(settled)return;if(Number(event?.loaded)>lastBytes){lastBytes=Number(event.loaded);arm();}onProgress(event);},
    error=>finish(reject,error)
   );
   if(typeof cancel==='function')abort=cancel;
  }catch(error){finish(reject,error);}
 });
}
