import test from 'node:test';
import assert from 'node:assert/strict';
// Pure TypeScript module, run with Node's built-in type stripping.
const modulePath='../src/modules/partnership/settlement-client.ts';
const storage=()=>{const rows=new Map();return {getItem:k=>rows.get(k)??null,setItem:(k,v)=>rows.set(k,v),removeItem:k=>rows.delete(k)};};
const request=()=>({input:{requestId:'11111111-1111-4111-8111-111111111111',date:'2026-11-04',description:'תשלום לדוד',nadavOwesDavidCleared:500,davidOwesNadavCleared:0},expectedFingerprint:'a'.repeat(64)});
test('double click shares one network request and pending survives until acknowledgement',async()=>{
 const {createSettlementWriter}=await import(modulePath);const store=storage();let calls=0,resolve;
 const writer=createSettlementWriter(async()=>{calls++;return new Promise(r=>{resolve=r;});},store);
 const first=writer.save(request()),second=writer.save(request());assert.equal(calls,1);assert.deepEqual(writer.pending(),request());resolve({ok:true});
 assert.deepEqual(await first,await second);assert.deepEqual(writer.pending(),request());writer.acknowledge(request().input.requestId);assert.equal(writer.pending(),null);
});
test('lost response and page reload retain the same request ID and payload for retry',async()=>{
 const {createSettlementWriter}=await import(modulePath);const store=storage();let saved;
 const first=createSettlementWriter(async body=>{saved=body;throw new Error('response lost after commit');},store);
 await assert.rejects(first.save(request()),/response lost/);
 const reloaded=createSettlementWriter(async body=>{assert.deepEqual(body,saved);return {ok:true,replayed:true};},store);
 assert.deepEqual(reloaded.pending(),request());assert.equal((await reloaded.save(reloaded.pending())).replayed,true);
});
test('an unresolved payment cannot be replaced with a new request or silently edited',async()=>{
 const {createSettlementWriter}=await import(modulePath);const store=storage();let calls=0;
 const writer=createSettlementWriter(async()=>{calls++;throw new Error('timeout');},store);await assert.rejects(writer.save(request()));
 await assert.rejects(writer.save({...request(),input:{...request().input,requestId:'22222222-2222-4222-8222-222222222222'}}),/קודמת/);
 await assert.rejects(writer.save({...request(),input:{...request().input,nadavOwesDavidCleared:400}}),/קודמת/);assert.equal(calls,1);
});
test('an explicit rejection before saving permits a refreshed preview with the same operation ID',async()=>{
 const {createSettlementWriter}=await import(modulePath);const store=storage();let calls=0;
 const writer=createSettlementWriter(async()=>{if(++calls===1)throw Object.assign(new Error('stale preview'),{notSaved:true});return {ok:true};},store);
 await assert.rejects(writer.save(request()),/stale preview/);assert.equal(writer.pending(),null);
 assert.equal((await writer.save({...request(),expectedFingerprint:'b'.repeat(64)})).ok,true);
});
