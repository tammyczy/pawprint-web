// Small development check: fictitious text only, one request per case, no retries.
// Run only with explicit authorization: node --env-file=.env review/french-audit-2026-11-09/live-check.mjs
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createCompanionAI} from '../../server/companion-ai.mjs';
import {guardCompanionAction} from '../../server/action-guard.mjs';

const cases=[
 {id:'real-fr-01',text:"Arrête-toi, s'il te plaît.",allowed:['stop']},
 {id:'real-fr-02',text:'Ne bouge plus, reste ici.',allowed:['stop']},
 {id:'real-fr-03',text:'Peux-tu rentrer dans ton panier ?',allowed:['home']},
 {id:'real-fr-04',text:'Saute aux conclusions de ce roman.',allowed:[null]},
 {id:'real-fr-05',text:'Parlons de la marche de dimanche.',allowed:[null]},
 {id:'real-fr-06',text:'Ne saute pas maintenant.',allowed:[null,'stop'],note:'Initial movement unspecified; neither choice alone proves the right behavior.'},
 {id:'real-fr-07',text:'Ne cours pas, viens près de moi.',allowed:['come']},
 {id:'real-fr-08',text:'Marche puis arrête-toi.',allowed:['stop'],note:'The project chooses stop over a multi-action sequence; it does not execute both.'},
 {id:'real-fr-09',text:'Merci de rester immobile.',allowed:['stop']}
];
const files=['server/action-guard.mjs','server/action-intent.mjs','server/french-physical-stop.mjs','server/companion-ai.mjs','src/commands.js'];
const hash=async file=>createHash('sha256').update(await readFile(file)).digest('hex');
if(!process.env.OPENAI_API_KEY)throw new Error('OpenAI is not configured.');
const hashes=Object.fromEntries(await Promise.all(files.map(async file=>[file,await hash(file)])));
let captured=null;
const fetchImpl=async(url,options)=>{
 const response=await fetch(url,options);
 if(response.ok){const body=await response.clone().json();captured={status:body.status??null,model:body.model??null,usage:body.usage??null,output:body.output??null};}
 return response;
};
const model=process.env.OPENAI_MODEL||'gpt-5.4-mini';
const ask=createCompanionAI({apiKey:process.env.OPENAI_API_KEY,model,fetchImpl});
const rows=[];
for(const item of cases){
 captured=null;const start=Date.now();
 try{
  const raw=await ask({name:'Biscuit',kind:'dog',text:item.text,history:[]});
  const guarded=guardCompanionAction({name:'Biscuit',text:item.text,answer:raw});
  rows.push({...item,raw,guarded,provider:captured,durationMs:Date.now()-start,error:null});
 }catch(error){rows.push({...item,raw:null,guarded:null,provider:null,durationMs:Date.now()-start,error:String(error?.message||'request failed')});}
}
const after=Object.fromEntries(await Promise.all(files.map(async file=>[file,await hash(file)])));
if(JSON.stringify(hashes)!==JSON.stringify(after))throw new Error('Source changed during the run; results are not recorded as one version.');
const directory='review/french-audit-2026-11-09/live';await mkdir(directory,{recursive:true});
const file=`${directory}/${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
await writeFile(file,JSON.stringify({notice:'Fictitious development cases, one real model call each, directly through adapter and guard; not a user study, independent benchmark or browser test.',date:new Date().toISOString(),model,hashes,rows},null,2)+'\n');
console.log(JSON.stringify({file,requests:rows.length,errors:rows.filter(row=>row.error).length}));
