import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
import {test} from 'node:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';
const require=createRequire(import.meta.url);
function load(path,mocks={}){
 const module={exports:{}};
 runInNewContext(ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{module,exports:module.exports,require:id=>mocks[id]||require(id)});
 return module.exports;
}
const helpers=load('../src/lib/financeObligations.ts');
test('refresh distinguishes unchanged data, changed accounts and older-server unknown counts',()=>{
 const {refreshChangeLabel}=load('../src/lib/financeRefreshNotice.ts');
 assert.match(refreshChangeLabel({dataChanged:false}),/לא התקבל שינוי/);
 assert.match(refreshChangeLabel({dataChanged:true,changes:{transactionsAdded:0,transactionsUpdated:0,accountsAdded:0,accountsUpdated:1}}),/חשבונות שהתעדכנו: 1/);
 assert.doesNotMatch(refreshChangeLabel({}),/לא התקבל שינוי/);
});
const item=(id,purpose,amount=10,direction='out')=>({id,purpose,amount,direction,merchant:id,date:'2026-10-22',transactionDate:'2026-10-22',supersedes:[]});
test('purpose totals use cents, net refunds and never infer from an account purpose',()=>{
 const totals=helpers.purposeTotals([item('p','personal',.1),item('q','personal',.2),item('r','business',10),item('refund','business',2,'in'),item('d','david_payment',320.88),item('missing',undefined,9)]);
 assert.equal(totals.personal,.3);assert.equal(totals.business,8);assert.equal(totals.david_payment,320.88);assert.equal(totals.unclassified,9);
});
test('category breakdown keeps every purchase once, nets refunds and isolates explicit project notes',()=>{
 const purchases=[
  {...item('game','personal',47.99),category:'פנאי'},
  {...item('refund','personal',35.19,'in'),category:'פנאי'},
  {...item('gpt','business',581.04),category:'כלים ותוכנות',note:'פרויקט: קוקפיט. אישור נדב.'},
  {...item('claude','business',65.64),category:'כלים ותוכנות',note:'לא משויך לקוקפיט'},
  {...item('david','david_payment',797.67),category:'תשלום על חשבון חוב לדוד'},
  {...item('unknown','unclassified',25),category:'דברים לבית'},
  {...item('same-category','personal',5),category:'כלים ותוכנות'},
 ];
 const groups=helpers.groupCardCategories(purchases);
 assert.equal(groups.find(g=>g.label==='פנאי').amount,12.8);
 assert.equal(groups.find(g=>g.label==='פנאי').charges,47.99);
 assert.equal(groups.find(g=>g.label==='פנאי').credits,35.19);
 assert.equal(groups.find(g=>g.label==='קוקפיט').amount,581.04);
 assert.equal(groups.filter(g=>g.label==='כלים ותוכנות').length,2);
 assert.equal(groups.find(g=>g.label==='דברים לבית').amount,25);
 assert.equal(groups.find(g=>g.label==='תשלום עבור דוד').amount,797.67);
 assert.equal(groups.reduce((n,g)=>n+g.items.length,0),purchases.length);
 assert.equal(Math.round(groups.reduce((n,g)=>n+g.amount,0)*100),148715);
});
const state={bank:{amount:10000},reserved:{amount:600},available:{amount:9400},currency:'ILS',accounts:[{id:'card',name:'Visa 9914',providerId:'pepper',type:'credit_card'}],obligations:[{id:'bill',source:'open_finance:card',label:'card',amount:400,date:'2026-11-02',status:'estimated',reserved:true,card:{accountId:'card',name:'Visa 9914',providerId:'pepper',checkingAccount:{id:'bank',name:'Pepper',providerId:'pepper'}},items:[item('David','david_payment',320),item('Business','business',80)]},{id:'pending',source:'open_finance:card',amount:100,date:null,reserved:true,items:[item('Unknown',undefined,100)]},{id:'david',label:'דוד',source:'partnership',amount:100,date:null,reserved:true}]};
test('dated bill and pending reserve group by stable card id; David debt remains separate',()=>{
 const result=helpers.groupCardObligations(state);assert.equal(result.cards.length,1);assert.equal(result.cards[0].obligations.length,2);assert.equal(result.other[0].id,'david');
 const sorted=helpers.groupCardObligations({...state,obligations:[...state.obligations].reverse()});assert.equal(sorted.cards[0].id,'card');
});
test('card details render date, source bank, purposes, non-final reserve caveat and retained editor',()=>{
 const Component=load('../src/components/finance/FinanceObligations.tsx',{'@/lib/financeObligations':helpers,'@/lib/financeFormatters':{money:v=>v==null?'לא ידוע':`${v} ₪`,dateLabel:d=>d,accountName:n=>n},'./ObligationEvidence':{default:()=>null}}).default;
 const html=renderToStaticMarkup(React.createElement(Component,{state,onEdit:()=>{},onEditBusiness:()=>{}}));
 assert.match(html,/Visa 9914/);assert.match(html,/עו״ש צפוי לחיוב: Pepper/);assert.match(html,/2026-11-02/);assert.match(html,/תשלום עבור דוד/);assert.match(html,/רזרבה ללא מועד/);assert.match(html,/לא חיוב נוסף מאומת/);assert.match(html,/לא קיזוז חדש/);assert.match(html,/סינון עסקאות הכרטיס/);assert.match(html,/9400 ₪/);
});
