export interface SettlementInput {
  requestId: string;
  date: string;
  description: string;
  nadavOwesDavidCleared: number;
  davidOwesNadavCleared: number;
}
export interface PendingSettlement { input: SettlementInput; expectedFingerprint: string }
export interface SettlementPreview {
  before: { nadavOwesDavid: number; davidOwesNadav: number; status: string };
  after: { nadavOwesDavid: number; davidOwesNadav: number; status: string };
  fingerprint: string;
  replayed: boolean;
}
type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const KEY = 'junkie-pending-partnership-settlement-v1';

// Keep the operation across a lost response or page reload. Only an acknowledged
// server result clears it; neither a timeout nor another click creates a new ID.
export function createSettlementWriter<T>(send: (body: SettlementInput & { expectedFingerprint: string }) => Promise<T>, store: Store) {
  let active: { signature: string; promise: Promise<T> } | null = null;
  function pending(): PendingSettlement | null {
    const raw = store.getItem(KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as PendingSettlement;
    if (!value?.input?.requestId || typeof value.expectedFingerprint !== 'string') throw new Error('לא ניתן לקרוא את הבקשה הקודמת. אל תרשום תשלום נוסף לפני בירור.');
    return value;
  }
  function save(request: PendingSettlement): Promise<T> {
    const signature = JSON.stringify(request), prior = pending();
    if (prior && JSON.stringify(prior) !== signature) return Promise.reject(new Error('יש בקשת תשלום קודמת שתוצאתה לא אומתה. בדוק אותה לפני יצירת תשלום נוסף.'));
    if (active) return active.signature === signature ? active.promise : Promise.reject(new Error('בקשת תשלום קודמת עדיין נשמרת.'));
    store.setItem(KEY, signature);
    const promise = send({ ...request.input, expectedFingerprint: request.expectedFingerprint }).catch(error => {
      if (error?.notSaved === true) acknowledge(request.input.requestId);
      throw error;
    });
    active = { signature, promise };
    const clear = () => { active = null; };
    void promise.then(clear, clear);
    return promise;
  }
  function acknowledge(requestId: string) { if (pending()?.input.requestId === requestId) store.removeItem(KEY); }
  return { pending, save, acknowledge };
}
