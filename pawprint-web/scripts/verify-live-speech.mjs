import {mkdir,writeFile} from 'node:fs/promises';
const base='http://127.0.0.1:8788',dir=new URL('../.data/ui-qa/',import.meta.url);
await mkdir(dir,{recursive:true});
const health=await(await fetch(base+'/api/health')).json();
console.log(JSON.stringify({check:'health',...health}));
const combinations=[...health.speechVoices.map(voice=>({voice,tone:'natural'})),{voice:'verse',tone:'cheerful'},{voice:'verse',tone:'comfort'}];
const results=await Promise.all(combinations.map(async({voice,tone})=>{
 const response=await fetch(base+'/api/companion/speech',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({text:tone==='comfort'?'Take your time. I am here with you.':'Hello! I am here with you.',voice,tone}),signal:AbortSignal.timeout(45000)});
 if(!response.ok)return {voice,tone,status:response.status,error:(await response.json()).error};
 const audio=Buffer.from(await response.arrayBuffer()),file=`${voice}-${tone}.mp3`;await writeFile(new URL(file,dir),audio);
 return {voice,tone,status:response.status,type:response.headers.get('content-type'),bytes:audio.length,file};
}));
await writeFile(new URL('speech-results.json',dir),JSON.stringify({testedAt:new Date().toISOString(),results},null,2));
console.log(JSON.stringify(results,null,2));
if(results.some(result=>result.status!==200||!result.bytes))process.exitCode=1;

