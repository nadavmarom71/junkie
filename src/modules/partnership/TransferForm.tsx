import { useEffect, useMemo, useRef, useState } from 'react';
import api from '@/lib/api';
import { usePartnership } from './PartnershipContext';
import type { Payer } from './PartnershipContext';
import type { SettlementInput, SettlementPreview } from './settlement-client';

const israelToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const money = (n: number | null) => n === null ? 'לא ידוע' : n.toLocaleString('he-IL', { style: 'currency', currency: 'ILS' });

export default function TransferForm({ onSaved }: { onSaved: () => void }) {
  const { computed, canonical, isLoading, loadError, saveError, pendingSettlement, isSavingSettlement, recordSettlement } = usePartnership();
  const restored = pendingSettlement?.input;
  const [amount, setAmount] = useState(restored ? String(restored.nadavOwesDavidCleared || restored.davidOwesNadavCleared) : '');
  const [description, setDescription] = useState(restored?.description || '');
  const [date, setDate] = useState(restored?.date || israelToday());
  const [paidBy, setPaidBy] = useState<Payer>(restored?.davidOwesNadavCleared ? 'david' : 'nadav');
  const requestId = useRef(restored?.requestId || crypto.randomUUID());
  const submitLock = useRef(false);
  const [preview, setPreview] = useState<SettlementPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [saved, setSaved] = useState(false);
  const [retryPreview, setRetryPreview] = useState(0);
  const draft = useMemo<SettlementInput | null>(() => {
    const n = Number(amount);
    return n > 0 && description.trim() && date ? { requestId: requestId.current, date, description: description.trim(), nadavOwesDavidCleared: paidBy === 'nadav' ? n : 0, davidOwesNadavCleared: paidBy === 'david' ? n : 0 } : null;
  }, [amount, description, date, paidBy]);
  const inputKey = JSON.stringify(pendingSettlement?.input || draft);
  const input = useMemo<SettlementInput | null>(() => JSON.parse(inputKey), [inputKey]);
  useEffect(() => {
    let cancelled = false;
    setPreview(null);
    setError(null);
    if (!input || isLoading || loadError || saved) { setChecking(false); return; }
    setChecking(true);
    const timer = setTimeout(() => {
      api.post<unknown, SettlementPreview>('/partnership/settlements/preview', input)
        .then(result => { if (!cancelled) setPreview(result); })
        .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'לא ניתן לחשב את התשלום'); })
        .finally(() => { if (!cancelled) setChecking(false); });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [input, isLoading, loadError, saved, retryPreview]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitLock.current || !input || !preview || isSavingSettlement || saved || loadError || saveError) return;
    submitLock.current = true;
    setError(null);
    try {
      await recordSettlement(input, pendingSettlement?.expectedFingerprint || preview.fingerprint);
      setSaved(true);
      onSaved();
    } catch (e) {
      setError((e instanceof Error ? e.message : 'תוצאת השמירה לא ברורה') + ' · לא ניצור בקשה חדשה. אפשר לבדוק שוב את אותה העברה.');
    } finally { submitLock.current = false; }
  }
  const locked = !!pendingSettlement || isSavingSettlement || saved;
  const from = paidBy === 'nadav' ? 'נדב' : 'דוד', to = paidBy === 'nadav' ? 'דוד' : 'נדב';
  return <form onSubmit={submit} className="space-y-4" data-testid="partnership-transfer-form">
    <p className="text-sm text-white/60">רישום תשלום שכבר בוצע. אינו מעביר כסף בבנק. החוב מחושב מאותו מקור של מסך הכספים.</p>
    {pendingSettlement && <p role="status" className="text-sm text-amber-300">יש בקשה קודמת שעדיין לא אושרה בדפדפן. הבדיקה והשמירה ישתמשו באותו מזהה כדי למנוע רישום כפול.</p>}
    <fieldset disabled={locked} className="space-y-4 disabled:opacity-60">
      <div className="flex gap-2">
        {(['nadav', 'david'] as const).map(p => <button key={p} type="button" onClick={() => setPaidBy(p)} aria-pressed={paidBy === p} className={`flex-1 rounded-xl py-2.5 text-sm font-bold ${paidBy === p ? 'bg-purple-600 text-white' : 'bg-white/5 text-white/60'}`}>{p === 'nadav' ? 'נדב משלם לדוד' : 'דוד משלם לנדב'}</button>)}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm text-white/70">סכום (₪)<input aria-label="סכום העברה" type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white" /></label>
        <label className="text-sm text-white/70">תאריך התשלום<input aria-label="תאריך התשלום" type="date" value={date} max={israelToday()} onChange={e => setDate(e.target.value)} required className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white" /></label>
      </div>
      <label className="block text-sm text-white/70">על מה / סיבה<input aria-label="סיבת ההעברה" value={description} onChange={e => setDescription(e.target.value)} required maxLength={1000} className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white" /></label>
    </fieldset>
    <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm space-y-2" data-testid="partnership-current-balance">
      <div className="flex justify-between"><span>נדב חייב לדוד</span><strong>{money(computed.nadavOwesDavid)}</strong></div>
      <div className="flex justify-between"><span>דוד חייב לנדב</span><strong>{money(computed.davidOwesNadav)}</strong></div>
      {canonical?.status === 'estimated' && <p className="text-xs text-amber-300">היתרה היא אומדן לפי הרישומים והתאמות הבנק; רישום התשלום עצמו יהיה מאושר.</p>}
    </div>
    {checking && <p role="status" className="text-sm text-white/60">בודק את החוב בשרת…</p>}
    {preview && <div className="rounded-xl border border-orange-500/30 p-3 text-sm space-y-2" data-testid="partnership-settlement-preview">
      <strong>תצוגה מקדימה · {from} משלם ל{to}</strong>
      <div className="flex justify-between"><span>נדב חייב לדוד — לפני</span><span>{money(preview.before.nadavOwesDavid)}</span></div>
      <div className="flex justify-between"><span>נדב חייב לדוד — אחרי</span><strong>{money(preview.after.nadavOwesDavid)}</strong></div>
      {paidBy === 'david' && <div className="flex justify-between"><span>דוד חייב לנדב — אחרי</span><strong>{money(preview.after.davidOwesNadav)}</strong></div>}
      {preview.replayed && <p>הבקשה הזו כבר רשומה בשרת. אישור נוסף יאמת אותה ללא תשלום נוסף.</p>}
    </div>}
    {(error || loadError || saveError) && <p role="alert" className="text-sm text-red-300">{error || loadError || saveError}</p>}
    {error && <button type="button" className="text-sm text-amber-300 underline" onClick={() => setRetryPreview(n => n + 1)}>בדוק שוב את אותה העברה</button>}
    <button type="submit" disabled={!preview || checking || isLoading || isSavingSettlement || saved || !!loadError || !!saveError} className="w-full rounded-xl bg-purple-600 py-3 text-sm font-bold text-white disabled:opacity-40">{isSavingSettlement ? 'ממתין לאישור השרת…' : saved ? 'נשמר בשרת' : pendingSettlement ? 'אמת את הבקשה הקודמת ללא רישום כפול' : `רשום תשלום · ${from} ל${to}`}</button>
  </form>;
}
