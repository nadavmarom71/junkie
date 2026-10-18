import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../src/components/finance/FinancePartnership.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function render(unresolved) {
  const module = { exports: {} };
  const mockUI = Object.fromEntries(['Empty', 'FinanceError', 'FinanceSheet', 'Loading', 'TrustBadge'].map(name => [name, () => null]));
  runInNewContext(compiled, {
    module,
    exports: module.exports,
    require(id) {
      if (id === '@/hooks/useFinance') return {
        useFinance: () => ({ data: { status: 'estimated', outstanding: { amount: 3686 }, items: [], settlements: [], unresolved } }),
        useFinanceSave: () => ({}),
      };
      if (id === './FinanceUI') return mockUI;
      if (id === './FinanceVisuals') return { FinanceDataIcon: () => null };
      if (id === '@/lib/financeFormatters') return { money: value => `${value} ₪`, dateLabel: value => value };
      return require(id);
    },
  });
  return renderToStaticMarkup(React.createElement(module.exports.default));
}

test('Yair possible deduction appears directly below the unchanged David debt', () => {
  const html = render([{ id: 'yair-wedding-750', amount: 750, status: 'unresolved' }]);
  const total = html.slice(html.indexOf('fn-partner-total'), html.indexOf('fn-partner-equation'));
  assert.match(total, /fn-big-number[^>]*>3686 ₪<\/strong>/);
  assert.match(total, /role="note"[^>]*>לא כולל קיזוז אפשרי של 750 ₪ — יאיר\. עדיין בבירור; הסכום לא הופחת מהחוב\./);
});

test('resolved or absent Yair entry does not leave a stale debt note', () => {
  for (const unresolved of [[], [{ id: 'yair-wedding-750', amount: 750, status: 'resolved' }]]) {
    const html = render(unresolved);
    const total = html.slice(html.indexOf('fn-partner-total'), html.indexOf('fn-partner-equation'));
    assert.doesNotMatch(total, /role="note"/);
  }
});
