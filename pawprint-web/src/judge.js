import './judge.css';
import {explainCommand} from './commands.js';
const output=document.querySelector('#intent-output');
function inspect(){const result=explainCommand(document.querySelector('#inspect-text').value);output.textContent=`Action: ${result.action??'none (abstain)'} · Reason: ${result.reason} · Engine: local rules`;}
document.querySelector('#inspect-form').addEventListener('submit',event=>{event.preventDefault();inspect();});inspect();
const status=document.querySelector('#evidence-status');
try{
 const response=await fetch('/evidence/command-evaluation.json',{signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw new Error('Report unavailable');
 const report=await response.json();
 if(report.schemaVersion!==1||!Array.isArray(report.current?.rows))throw new Error('Unsupported report');
 status.textContent=`Saved run: ${new Date(report.generatedAt).toISOString()} · ${report.current.total} cases · dataset SHA-256 ${report.datasetSha256.slice(0,12)}…`;
 const metrics=document.querySelector('#metrics');
 for(const [value,label,note]of [
  [`${report.baseline.correct}/${report.baseline.total}`,'Original exact matches','Frozen substring matcher'],
  [`${report.current.correct}/${report.current.total}`,'Revised exact matches','Known limitations remain in this set'],
  [`${report.baseline.falseActions} → ${report.current.falseActions}`,'Unrequested actions on negative cases',`${report.current.negativeCases} negative cases; this is not a real-world rate`]
 ]){const card=document.createElement('div');card.className='metric';for(const [tag,text]of [['strong',value],['span',label],['small',note]]){const item=document.createElement(tag);item.textContent=text;card.append(item);}metrics.append(card);}metrics.hidden=false;
 const rows=document.querySelector('#case-rows');
 for(const [index,row]of report.current.rows.entries()){const tr=document.createElement('tr');if(!row.pass)tr.className='failed';for(const value of [row.text,row.expected??'none',report.baseline.rows[index].actual??'none',`${row.actual??'none'}${row.pass?'':' · mismatch'}`]){const td=document.createElement('td');td.textContent=value;tr.append(td);}rows.append(tr);}
}catch{status.textContent='The saved experiment could not load. Run npm run evaluate, rebuild, and refresh. The local inspector below remains available.';}
