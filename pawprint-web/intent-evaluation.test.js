import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeEvaluated} from './eval/intent/trainer.mjs';
import {evaluateComparison} from './eval/intent/compare-evaluation.mjs';

test('provider errors never become correct no-action results, including in groups and confusion',()=>{
 const report=summarizeEvaluated([
  {group:'negative',expected:null,actual:null,failed:true},
  {group:'negative',expected:null,actual:null,failed:false},
  {group:'commands',expected:'run',actual:'run',failed:false},
  {group:'commands',expected:'jump',actual:null,failed:true},
  {group:'failed-only',expected:null,actual:null,failed:true}
 ]);
 assert.equal(report.requests,5);
 assert.equal(report.errors,3);
 assert.equal(report.total,2);
 assert.equal(report.correct,2);
 assert.equal(report.accuracy,1);
 assert.equal(report.negativeCases,1);
 assert.equal(report.falseActions,0);
 assert.equal(report.missedActions,0);
 assert.equal(report.confusion.none.none,1);
 assert.equal(report.confusion.run.run,1);
 assert.equal(report.groups.negative.requests,2);
 assert.equal(report.groups.negative.errors,1);
 assert.equal(report.groups.negative.total,1);
 assert.equal(report.groups.negative.correct,1);
 assert.equal(report.groups.commands.errors,1);
 assert.equal(report.groups.commands.total,1);
 assert.equal(report.groups.commands.missedActions,0);
 assert.equal(report.groups['failed-only'].requests,1);
 assert.equal(report.groups['failed-only'].errors,1);
 assert.equal(report.groups['failed-only'].total,0);
 assert.equal(report.groups['failed-only'].accuracy,null);
 assert.equal(report.groups['failed-only'].macroF1,null);
 assert.equal(report.groups['failed-only'].falseActionRate,null);
});

test('when all calls fail no score is reported and confusion remains empty',()=>{
 const report=summarizeEvaluated([
  {group:'negation',expected:null,actual:null,failed:true},
  {group:'negation',expected:'run',actual:null,failed:true}
 ]);
 assert.equal(report.requests,2);
 assert.equal(report.errors,2);
 assert.equal(report.total,0);
 assert.equal(report.accuracy,null);
 assert.equal(report.macroF1,null);
 assert.equal(report.falseActionRate,null);
 assert.equal(Object.values(report.confusion).flatMap(Object.values).reduce((a,b)=>a+b,0),0);
});

test('comparison preserves successful no-action, excludes provider errors and catches thrown errors',async()=>{
 const cases=[
  {id:'a',group:'negative',text:'none',expected:null},
  {id:'b',group:'negative',text:'error',expected:null},
  {id:'c',group:'commands',text:'throw',expected:'run'},
  {id:'d',group:'commands',text:'run',expected:'run'}
 ];
 const result=await evaluateComparison(cases,{
  systems:{baseline:()=>null},
  llm:async text=>{if(text==='error')return {error:'timeout'};if(text==='throw')throw new Error('offline');return text==='run'?'run':null;}
 });
 assert.equal(result.rows[0].llm,null);
 assert.equal(result.rows[0].llmStatus,'ok');
 assert.equal(result.rows[1].llmStatus,'error');
 assert.equal(result.rows[2].llmError,'offline');
 assert.equal(result.systems.llm.requests,4);
 assert.equal(result.systems.llm.errors,2);
 assert.equal(result.systems.llm.total,2);
 assert.equal(result.systems.llm.correct,2);
 assert.equal(result.systems.baseline.requests,4);
 assert.equal(result.systems.baseline.errors,0);
 assert.equal(result.systems.baseline.total,4);
 assert.equal(result.systems.llm.groups.negative.confusion.none.none,1);
});

test('missing or invalid model actions are request errors, not no-action predictions',async()=>{
 const result=await evaluateComparison([
  {id:'a',group:'negative',text:'missing',expected:null},
  {id:'b',group:'negative',text:'invalid',expected:null}
 ],{systems:{},llm:async text=>text==='missing'?undefined:'unsupported-action'});
 assert.equal(result.systems.llm.requests,2);
 assert.equal(result.systems.llm.errors,2);
 assert.equal(result.systems.llm.total,0);
 assert.equal(result.systems.llm.accuracy,null);
});
