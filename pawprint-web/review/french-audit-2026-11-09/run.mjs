import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {guardCompanionAction,requestedAction} from '../../server/action-guard.mjs';
const [input,output]=process.argv.slice(2);
if(!input||!output)throw Error('Specify frozen input and new output files');
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const paths=['server/action-guard.mjs','server/action-intent.mjs','server/french-physical-stop.mjs','server/companion-ai.mjs','server/provider-response.mjs','src/commands.js','src/immediate-stop.js'];
const sourceHashes=Object.fromEntries(paths.map(p=>[p,hash(p)]));
const data=JSON.parse(readFileSync(input));
const cases=data.cases.map(c=>{
 const answer=guardCompanionAction({text:c.text,name:'Lanlao',answer:{action:c.modelAction,caption:'synthetic',sound:null}});
 const actual=answer.action??null;
 return {...c,recognized:requestedAction(c.text,'Lanlao'),actual,match:c.allowed.includes(actual)};
});
if(paths.some(p=>hash(p)!==sourceHashes[p]))throw Error('Source changed during test: discard and rerun');
writeFileSync(output,JSON.stringify({notice:'Synthetic inputs with hypothetical model action; not real AI, human blind testing or an estimate of real-world error.',datasetSha256:hash(input),sourceHashes,cases},null,2)+'\n',{flag:'wx'});
for(const c of cases.filter(c=>!c.match))console.log(JSON.stringify({id:c.id,text:c.text,expected:c.allowed,recognized:c.recognized,actual:c.actual,kind:c.kind}));
console.log('cases',cases.length,'mismatches',cases.filter(c=>!c.match).length);
