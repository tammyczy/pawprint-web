import {summarizeEvaluated} from './trainer.mjs';
import {INTENT_LABELS} from '../../src/intent-model.js';

const VALID_ACTIONS=new Set(INTENT_LABELS.filter(label=>label!=='none'));

// The provider adapter may return null for a valid no-action result; errors
// carry a separate status so they cannot be mistaken for that prediction.
export async function evaluateComparison(data,{systems,llm=null,llmStatus='skipped',describe=()=>({})}){
 const rows=[];
 for(const item of data){
  const row={id:item.id,group:item.group,text:item.text,expected:item.expected};
  for(const [name,run] of Object.entries(systems))row[name]=run(item.text);
  Object.assign(row,describe(item.text));
  if(llm){
   try{
    const result=await llm(item.text);
    if(result&&typeof result==='object'){
     row.llmStatus='error';row.llmError=String(result.error??'provider error');row.llm=null;
    }else if(result===null||VALID_ACTIONS.has(result)){row.llmStatus='ok';row.llm=result;}
    else{row.llmStatus='error';row.llmError='invalid action from provider';row.llm=null;}
   }catch(error){row.llmStatus='error';row.llmError=String(error?.message??error);row.llm=null;}
  }
  rows.push(row);
 }
 const names=[...Object.keys(systems),...(llm?['llm']:[])],out={};
 for(const name of names){
  const view=rows.map(r=>({group:r.group,expected:r.expected,actual:r[name],failed:name==='llm'&&r.llmStatus==='error'}));
  out[name]=summarizeEvaluated(view);
 }
 if(!llm)out.llm={status:llmStatus};
 return {systems:out,rows};
}
