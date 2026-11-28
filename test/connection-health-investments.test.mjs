import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
import {test} from 'node:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';
const require=createRequire(import.meta.url),today='2026-11-28';
function load(file,mocks={}){
 const source=readFileSync(new URL(file==='investmentFreshness'?'../src/lib/investmentFreshness.ts':`../src/components/finance/${file}.tsx`,import.meta.url),'utf8');
 const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const module={exports:{}};
 runInNewContext(compiled,{module,exports:module.exports,require(id){
  if(id in mocks)return mocks[id];
  if(id==='@/lib/investmentFreshness')return load('investmentFreshness');
  if(id==='@/lib/financeFormatters')return {dateLabel:x=>x,money:(x,c='ILS')=>`${x} ${c}`,israelToday:()=>today};
  if(id==='./FinanceUI')return {FinanceError:()=>null};
  if(id==='@/lib/api')return {default:{get:()=>{throw Error('unexpected request');}}};
  if(id==='@/hooks/useFinance')return {useFinanceSave:()=>({})};
  return require(id);
 }});return module.exports;
}
const c=(extra={})=>({id:'a',name:'Pepper',status:'ACTIVE',expiryDate:'2026-12-05',daysUntilExpiry:7,lastSyncedAt:'2026-11-28',sourceDataDate:'2026-11-27',accountCount:2,needsReconsent:true,...extra});
test('consent warning shows expiring and expired connections and the existing safe hosted renewal flow',()=>{
 const {ConnectionHealthBanner}=load('FinanceConnectionHealth');
 const html=renderToStaticMarkup(React.createElement(ConnectionHealthBanner,{data:{checkedAt:null,connections:[c(),c({id:'old',status:'EXPIRED',daysUntilExpiry:1000,accountCount:0})]}}));
 assert.match(html,/dir="rtl"/);assert.match(html,/נותרו 7 ימים/);assert.match(html,/פג תוקף/);assert.match(html,/ללא חשבונות בנתונים הנוכחיים/);assert.match(html,/https:\/\/financy.open-finance.ai\/settings/);assert.match(html,/2026-11-27/);
});
test('healthy consent does not warn and unavailable health read does not silently look healthy',()=>{
 const {ConnectionHealthBanner}=load('FinanceConnectionHealth');assert.equal(renderToStaticMarkup(React.createElement(ConnectionHealthBanner,{data:{connections:[c({needsReconsent:false})]}})),'');
 const mod=load('FinanceConnectionHealth',{'@tanstack/react-query':{useQuery:()=>({error:Error(),refetch:()=>{}})}});
 assert.match(renderToStaticMarkup(React.createElement(mod.default)),/אינה זמינה כרגע/);
});
const asset={id:'blink',name:'Blink',currency:'USD',currentValue:800,asOf:'2026-10-01',status:'estimated',source:'user_reported',historicalReference:null,deposits:2000,note:null};
test('manual investments show as-of and stale above 30 days, with a collapsed quick update form',()=>{
 const mod=load('FinanceInvestments'),html=renderToStaticMarkup(React.createElement(mod.default,{assets:[asset]}));
 assert.match(html,/2026-10-01/);assert.match(html,/לא מעודכן/);assert.match(html,/800 USD/);assert.match(html,/aria-expanded="false"/);assert.doesNotMatch(html,/<form/);
 assert.equal(load('investmentFreshness').investmentStale('2026-10-29',today),false);assert.equal(load('investmentFreshness').investmentStale('2026-10-28',today),true);assert.equal(load('investmentFreshness').investmentStale(null,today),true);assert.equal(load('investmentFreshness').investmentStale('2026-12-01',today),true);
});
function nodes(element){if(!element||typeof element!=='object')return [];return [element,...React.Children.toArray(element.props?.children).flatMap(nodes)];}
test('quick update saves only explicitly submitted valuation/date, never an expense or a transaction',()=>{
 let index=0;const calls=[];
 const mod=load('FinanceInvestments',{'react':{...React,useState:()=>[[true,'950.50',today][index++],()=>{}]},'@/hooks/useFinance':{useFinanceSave:()=>({mutate:payload=>calls.push(payload),reset:()=>{}})}});
 const tree=mod.InvestmentRow({asset}),form=nodes(tree).find(e=>e.type==='form');assert.ok(form);assert.equal(calls.length,0);
 form.props.onSubmit({preventDefault(){}});assert.equal(calls.length,1);
 assert.equal(calls[0].path,'/investments/blink/valuation');assert.equal(calls[0].method,'put');assert.equal(calls[0].body.currentValue,950.5);assert.equal(calls[0].body.asOf,today);assert.deepEqual(Object.keys(calls[0].body).sort(),['asOf','currentValue']);
});
test('blank and negative valuations cannot submit and busy save does not submit twice',()=>{
 for(const [value,busy] of [['',false],['-1',false],['800',true]]){
  let index=0,calls=0;
  const mod=load('FinanceInvestments',{'react':{...React,useState:()=>[[true,value,today][index++],()=>{}]},'@/hooks/useFinance':{useFinanceSave:()=>({isPending:busy,mutate:()=>calls++,reset:()=>{}})}});
  const tree=mod.InvestmentRow({asset}),form=nodes(tree).find(e=>e.type==='form');form.props.onSubmit({preventDefault(){}});assert.equal(calls,0);
 }
});
