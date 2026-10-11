import {test} from 'node:test';
import assert from 'node:assert/strict';
import {displayDate,parseDisplayDate,monthRange,recentMonths} from '../src/lib/financeDateRanges.ts';
test('Hebrew numeric dates are day, month, year',()=>{
  assert.equal(displayDate('2026-10-11'),'11.10.2026');
  assert.equal(parseDisplayDate('1.9.2026'),'2026-09-01');
  assert.equal(parseDisplayDate('01/10/2026'),'2026-10-01');
});
test('Reject invalid calendar dates instead of JS rolling into next month',()=>{
  for(const value of ['31.09.2026','29.02.2026','00.10.2026','11.13.2026','2026-10-11',''])assert.equal(parseDisplayDate(value),null);
  assert.equal(parseDisplayDate('29.02.2024'),'2024-02-29');
});
test('Full historical months exclude the next month first day',()=>{
  assert.deepEqual(monthRange('2026-09','2026-10-11'),{from:'2026-09-01',to:'2026-09-30'});
  assert.deepEqual(monthRange('2024-02','2026-10-11'),{from:'2024-02-01',to:'2024-02-29'});
});
test('Current month ends today',()=>{
  assert.deepEqual(monthRange('2026-10','2026-10-11'),{from:'2026-10-01',to:'2026-10-11'});
});
test('Rolling month shortcuts have stable year-month identities',()=>{
  const months=recentMonths('2026-02-11');
  assert.equal(months.length,12);
  assert.deepEqual(months.slice(0,3).map(m=>m.id),['2026-02','2026-01','2025-12']);
  assert.equal(months[0].label,'פברואר');
  assert.equal(new Set(months.map(m=>m.id)).size,12);
});
