export function money(amount: number | null | undefined, currency = 'ILS') {
  if (amount == null || !Number.isFinite(amount)) return 'לא ידוע';
  return new Intl.NumberFormat('he-IL', {style: 'currency', currency, maximumFractionDigits: 2, minimumFractionDigits: amount % 1 ? 2 : 0}).format(amount);
}
export function dateLabel(date: string | null | undefined, year = false) {
  if (!date) return 'עוד לא נקבע';
  const parsed = new Date(date.slice(0, 10) + 'T12:00:00');
  return Number.isNaN(parsed.getTime()) ? 'תאריך חסר' : parsed.toLocaleDateString('he-IL', {day: 'numeric', month: 'short', ...(year ? {year: 'numeric'} : {})});
}
export function numericDateLabel(date: string | null | undefined) {
  if (!date) return 'תאריך חסר';
  const parsed = new Date(date.slice(0, 10) + 'T12:00:00');
  return Number.isNaN(parsed.getTime()) ? 'תאריך חסר' : parsed.toLocaleDateString('he-IL', {day: '2-digit', month: '2-digit'});
}
export function israelToday() { return new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Jerusalem'}).format(new Date()); }
export function accountName(name: string, providerId?: string | null) {
  const bank = providerId?.toLowerCase() === 'pepper' ? 'Pepper' : providerId?.toLowerCase() === 'leumi' ? 'לאומי' : null;
  return bank ? `${bank} · ${name}` : name;
}
