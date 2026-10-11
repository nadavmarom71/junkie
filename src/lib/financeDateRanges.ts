// UI date selection only. API ranges remain inclusive ISO dates.
export type FinanceRange = 'month' | 'year' | 'all' | 'custom';
export function displayDate(value: string) {
  const [year, month, day] = value.split('-');
  return value ? `${day}.${month}.${year}` : '';
}
export function parseDisplayDate(value: string): string | null {
  const match = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec(value.trim());
  if (!match) return null;
  const [, day, month, year] = match;
  const iso = `${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}`;
  const parsed = new Date(`${iso}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0,10) === iso ? iso : null;
}
export function monthRange(month: string, today: string) {
  const [year, number] = month.split('-').map(Number);
  const finalDay = new Date(Date.UTC(year, number, 0)).toISOString().slice(0,10);
  return {from:`${month}-01`,to:finalDay > today ? today : finalDay};
}
export function recentMonths(today: string) {
  const [year, month] = today.split('-').map(Number);
  return Array.from({length:12}, (_, offset) => {
    const date = new Date(Date.UTC(year, month - 1 - offset, 1));
    return {id:date.toISOString().slice(0,7),label:new Intl.DateTimeFormat('he-IL',{month:'long',timeZone:'UTC'}).format(date),year:date.getUTCFullYear()};
  });
}
