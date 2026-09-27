import { useState } from 'react';
import { ArrowLeft, Landmark } from 'lucide-react';
import { useFinance } from '@/hooks/useFinance';
import { dateLabel, money } from '@/lib/financeFormatters';
import type { FinancialState, Inbox } from '@/types/finance';
import { FinanceError, Loading } from './FinanceUI';
import { FinanceDataIcon } from './FinanceVisuals';

type Scope = 'personal' | 'business';

export default function FinanceScopePanel({state, compact = false}: {state?: FinancialState; compact?: boolean}) {
  const [scope, setScope] = useState<Scope>('business');
  const [limit, setLimit] = useState(compact ? 3 : 6);
  const stateQuery = useFinance<FinancialState>('/state', !state);
  const financialState = state || stateQuery.data;
  const movements = useFinance<Inbox>(`/inbox?review=all&scope=${scope}&offset=0&limit=${limit}`);
  const accounts = financialState?.accounts.filter(account => account.type === 'checking' && account.purpose === scope) || [];
  const accountTotal = accounts.length && accounts.every(account => account.balance !== null && account.currency === 'ILS')
    ? accounts.reduce((total, account) => total + Number(account.balance), 0)
    : null;
  const accountDate = accounts.length && accounts.every(account => account.asOf === accounts[0].asOf) ? accounts[0].asOf : null;
  const accountTitle = accounts.map(account => account.providerId?.toLowerCase() === 'pepper' ? 'Pepper' : account.providerId?.toLowerCase() === 'leumi' ? 'לאומי' : account.name).join(' + ');

  function changeScope(next: Scope) {
    setScope(next);
    setLimit(compact ? 3 : 6);
  }

  return <section className="fn-scope-panel fn-surface" aria-label="אישי ועסקי">
    <div className="fn-scope-heading">
      <div><h2>הכסף לפי תחום</h2><p>חשבון לחוד, תנועות לחוד.</p></div>
      <div className="fn-scope-switch" role="group" aria-label="בחירת תחום">
        <button aria-pressed={scope === 'business'} onClick={() => changeScope('business')}>עסקי</button>
        <button aria-pressed={scope === 'personal'} onClick={() => changeScope('personal')}>אישי</button>
      </div>
    </div>
    <div className="fn-scope-body">
      <div className="fn-scope-account">
        <span className="fn-scope-account-icon"><Landmark size={20}/></span>
        <div><span>{accountTitle || (scope === 'business' ? 'חשבון עסקי' : 'חשבון אישי')}</span><strong>{money(accountTotal)}</strong><small>{accountDate ? `יתרה ל־${dateLabel(accountDate,true)}` : 'יתרה לא זמינה'} · לא סכום פנוי להוצאה</small></div>
      </div>
      <div className="fn-scope-movements">
        <div className="fn-scope-list-head"><h3>תנועות {scope === 'business' ? 'עסקיות' : 'אישיות'}</h3><span>לפי הסיווג, לא לפי שם הבנק</span></div>
        <FinanceError error={movements.error} retry={() => void movements.refetch()}/>
        {movements.isPending && <Loading label="טוען תנועות בנק…"/>}
        {movements.data && !movements.error && (movements.data.transactions.length ? <>
          <div className="fn-scope-movement-list">{movements.data.transactions.map(item => <div className="fn-scope-movement" key={item.id}>
            <FinanceDataIcon label={`${item.description || item.merchant || 'תנועת בנק'} ${item.category || ''}`} scope={scope} kind={item.direction === 'in' ? 'income' : 'expense'}/><div><strong>{item.description || item.merchant || 'תנועת בנק'}</strong><small>{dateLabel(item.date)}{item.category ? ` · ${item.category}` : ''}{item.reviewStatus !== 'confirmed' ? ' · סיווג לבדיקה' : ''}</small></div>
            <b className={item.direction === 'in' ? 'fn-income' : 'fn-expense'}>{item.direction === 'in' ? '+' : '−'}{money(item.amount,item.currency)}</b>
          </div>)}</div>
          {movements.data.total > limit && <button className="fn-link fn-scope-more" onClick={() => setLimit(current => current + (compact ? 6 : 12))}>עוד תנועות <ArrowLeft size={15}/></button>}
        </> : <p className="fn-scope-empty">אין עדיין תנועות בנק שסווגו כאן. תנועות שעדיין לא סווגו מחכות בחיבורים והתאמות.</p>)}
      </div>
    </div>
  </section>;
}
