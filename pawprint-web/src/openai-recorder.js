// A short, explicitly started recording; nothing is uploaded on cancellation.
export function createOpenAIRecorder({onState,onText,onError,getLanguage}){
 let active=null,version=0;
 function cancel(){version++;if(!active)return;const session=active;active=null;clearTimeout(session.timer);session.cancelled=true;session.controller?.abort();if(session.recorder?.state==='recording')session.recorder.stop();session.stream?.getTracks().forEach(track=>track.stop());onState('idle');}
 async function start(){
  if(active){if(active.recorder?.state==='recording')active.recorder.stop();return;}
  const session={cancelled:false,controller:new AbortController()},id=++version;active=session;onState('preparing');
  try{
   if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw new Error('Microphone recording is unavailable in this browser.');
   const stream=await navigator.mediaDevices.getUserMedia({audio:true});session.stream=stream;
   if(active!==session||id!==version){stream.getTracks().forEach(t=>t.stop());return;}
   const mime=['audio/webm','audio/mp4'].find(type=>MediaRecorder.isTypeSupported(type));
   if(!mime)throw new Error('This browser does not support a compatible audio format.');
   const recorder=new MediaRecorder(stream,{mimeType:mime}),chunks=[];session.recorder=recorder;
   recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
   recorder.onerror=()=>{if(active===session){cancel();onError('Microphone recording failed.');}};
   recorder.onstop=async()=>{
    clearTimeout(session.timer);stream.getTracks().forEach(t=>t.stop());
    if(session.cancelled||active!==session||id!==version)return;
    onState('transcribing');
    try{
     const blob=new Blob(chunks,{type:mime});if(!blob.size)throw new Error('No audio was recorded.');
     const form=new FormData();form.append('audio',blob,mime==='audio/mp4'?'speech.m4a':'speech.webm');form.append('language',getLanguage());
     const res=await fetch('/api/companion/transcribe',{method:'POST',body:form,signal:session.controller.signal});
     if(!res.ok)throw new Error('Speech recognition is unavailable. Check the server and API configuration.');
     const data=await res.json();if(active!==session||id!==version)return;
     if(!data.text?.trim())throw new Error('No speech was recognized. Please try again.');
     active=null;onState('idle');onText(data.text);
    }catch(error){if(active===session&&id===version){active=null;onState('idle');onError(error.message);}}
   };
   recorder.start();onState('recording');session.timer=setTimeout(()=>{if(recorder.state==='recording')recorder.stop();},10000);
  }catch(error){if(active===session){cancel();onError(error.message||'Microphone unavailable.');}}
 }
 return {start,cancel,get active(){return !!active;}};
}
