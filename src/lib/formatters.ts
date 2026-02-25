/**
 * Format a number as Israeli currency
 */
export function formatCurrency(
  amount: number,
  currency = 'ILS',
  locale = 'he-IL'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a date string (YYYY-MM-DD) to Hebrew long format
 */
export function formatDate(date: string, locale = 'he-IL'): string {
  if (!date) return '';
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date + 'T00:00:00'));
}

/**
 * Format a date string to DD/MM/YYYY format
 */
export function formatDateShort(date: string): string {
  if (!date) return '';
  const [year, month, day] = date.split('T')[0].split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Get a relative label (e.g. "עוד 3 ימים", "לפני 2 ימים")
 */
export function formatRelativeDays(date: string): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(date + 'T00:00:00');
  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'היום';
  if (diffDays === 1) return 'מחר';
  if (diffDays === -1) return 'אתמול';
  if (diffDays > 0) return `עוד ${diffDays} ימים`;
  return `באיחור ${Math.abs(diffDays)} ימים`;
}

/**
 * Format a number with thousands separators
 */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat('he-IL').format(n);
}

/**
 * Get color class based on positive/negative value
 */
export function getAmountColor(amount: number): string {
  return amount >= 0 ? 'text-green-600' : 'text-red-600';
}

/**
 * Get badge variant based on severity
 */
export function getSeverityVariant(severity: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (severity) {
    case 'critical': return 'destructive';
    case 'warning': return 'secondary';
    case 'positive': return 'default';
    default: return 'outline';
  }
}

/**
 * Get severity icon and color
 */
export function getSeverityDisplay(severity: string) {
  switch (severity) {
    case 'critical': return { icon: '🚨', color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/25' };
    case 'warning':  return { icon: '⚠️', color: 'text-yellow-300', bg: 'bg-yellow-500/10 border-yellow-500/25' };
    case 'positive': return { icon: '✅', color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/25' };
    default:         return { icon: '💡', color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/25' };
  }
}
