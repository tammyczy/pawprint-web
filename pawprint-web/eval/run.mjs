import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parseCommand} from '../src/commands.js';
import {baselineCommand} from './baseline-commands.js';
const development=await readFile(new URL('./cases.json',import.meta.url)),adversarial=await readFile(new URL('./adversarial.json',import.meta.url));
const dataset=Buffer.concat([development,adversarial]);
const cases=[...JSON.parse(development),...JSON.parse(adversarial)];
function evaluate(parse){
 const rows=cases.map(item=>({...item,actual:parse(item.text)})).map(row=>({...row,pass:row.actual===row.expected}));
 const summarize=items=>({correct:items.filter(x=>x.pass).length,total:items.length,accuracy:items.filter(x=>x.pass).length/items.length,falseActions:items.filter(x=>x.expected===null&&x.actual!==null).length,negativeCases:items.filter(x=>x.expected===null).length,missedActions:items.filter(x=>x.expected!==null&&x.actual===null).length,wrongActions:items.filter(x=>x.expected!==null&&x.actual!==null&&!x.pass).length});
 return {...summarize(rows),groups:Object.fromEntries([...new Set(rows.map(x=>x.group))].map(group=>[group,summarize(rows.filter(x=>x.group===group))])),rows};
}
const report={schemaVersion:1,generatedAt:new Date().toISOString(),scope:'Deterministic offline command parsing only; no paid APIs, LLM quality, user outcomes, clinical efficacy, or competition score measured.',method:'55 author-written development/exploratory cases plus 13 independent code-review adversarial cases, subsequently used for fixes. Not a blind held-out test or representative benchmark. Known failures retained. Dataset hash is SHA-256 of cases.json bytes followed by adversarial.json bytes.',datasetSha256:createHash('sha256').update(dataset).digest('hex'),parserSha256:createHash('sha256').update(await readFile(new URL('../src/commands.js',import.meta.url))).digest('hex'),baseline:evaluate(baselineCommand),current:evaluate(parseCommand)};
report.baselineSourceSha256=createHash('sha256').update(await readFile(new URL('./baseline-commands.js',import.meta.url))).digest('hex');
await mkdir(new URL('../public/evidence/',import.meta.url),{recursive:true});
await writeFile(new URL('../public/evidence/command-evaluation.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({scope:report.scope,baseline:{correct:report.baseline.correct,total:report.baseline.total,falseActions:report.baseline.falseActions},current:{correct:report.current.correct,total:report.current.total,falseActions:report.current.falseActions},retainedFailures:report.current.rows.filter(x=>!x.pass).map(x=>x.id)},null,2));
