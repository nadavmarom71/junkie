import type { LucideIcon } from 'lucide-react';
import {
  ArrowDownToLine,
  BadgeDollarSign,
  BookOpen,
  Bot,
  BriefcaseBusiness,
  Building2,
  Calculator,
  CarFront,
  Coffee,
  ContactRound,
  HandHeart,
  Handshake,
  HeartPulse,
  Landmark,
  Megaphone,
  Monitor,
  Plane,
  RefreshCcw,
  ShieldCheck,
  ShoppingBasket,
  Smartphone,
  Ticket,
  UserRound,
  UsersRound,
  UtensilsCrossed,
  WalletCards,
} from 'lucide-react';

export type FinanceTone = 'income' | 'business' | 'personal' | 'partner' | 'warning' | 'neutral';
export type FinanceAccent = 'blue' | 'indigo' | 'violet' | 'rose' | 'coral' | 'amber' | 'green' | 'teal' | 'cyan' | 'slate';

// Shared with the interactive donut so icon and segment colors never drift apart.
// eslint-disable-next-line react-refresh/only-export-components
export function financeVisual(label: string, kind?: string): {icon: LucideIcon; tone?: FinanceTone; accent: FinanceAccent} {
  const value = `${label} ${kind || ''}`.toLocaleLowerCase('he-IL');
  if (/(019|טלפון|סלולר|גלישה|אינטרנט|תקשורת|wi.?fi)/.test(value)) return {icon:Smartphone,accent:'cyan'};
  if (/(סופר|יוחננוף|מחסני|קניות|מכולת)/.test(value)) return {icon:ShoppingBasket,accent:'amber'};
  if (/(מסעד|טורטיה|אוכל|מזון|משקאות)/.test(value)) return {icon:UtensilsCrossed,accent:'coral'};
  if (/(קפה|coffee)/.test(value)) return {icon:Coffee,accent:'amber'};
  if (/(זאפה|אירוע|בידור|פנאי|כרטיסים)/.test(value)) return {icon:Ticket,accent:'violet'};
  if (/(openai|anthropic|higgsfield|render|genspark|תוכנ|אוטומצי|\bai\b|אחסון)/.test(value)) return {icon:Bot,accent:'indigo'};
  if (/(שיווק|פרסום|facebook|meta|קמפיין)/.test(value)) return {icon:Megaphone,accent:'coral'};
  if (/(משרד|שכירות|דירה|ארנונה|titan)/.test(value)) return {icon:Building2,accent:'teal'};
  if (/(נסיע|תחבורה|דלק|רכב|מונית)/.test(value)) return {icon:CarFront,accent:'cyan'};
  if (/(בריאות|מכבי|רפואה|תרופה)/.test(value)) return {icon:HeartPulse,accent:'rose'};
  if (/(ביטוח)/.test(value)) return {icon:ShieldCheck,accent:'blue'};
  if (/(תרומ|כבוד)/.test(value)) return {icon:HandHeart,accent:'rose'};
  if (/(חינוך|קורס|אימון|לימוד)/.test(value)) return {icon:BookOpen,accent:'amber'};
  if (/(טיסה|חו״ל|נסיעות)/.test(value)) return {icon:Plane,accent:'cyan'};
  if (/(ציוד|חומרה|מחשב|nvidia|ksp)/.test(value)) return {icon:Monitor,accent:'slate'};
  if (/(רואה חשבון|ייעוץ|מקצועי|מס)/.test(value)) return {icon:Calculator,accent:'amber'};
  if (/(משכורת|שכר|עובדים)/.test(value)) return {icon:UsersRound,accent:'blue'};
  if (/(ריטיינר|קבוע|חוזר)/.test(value)) return {icon:RefreshCcw,accent:'teal'};
  if (/(דוד|שותפ)/.test(value)) return {icon:Handshake,tone:'partner',accent:'violet'};
  if (/(לקוח)/.test(value)) return {icon:ContactRound,accent:'blue'};
  if (/(גבייה|תקבול)/.test(value)) return {icon:BadgeDollarSign,tone:'income',accent:'green'};
  if (/(הכנסה|עסקה|מקדמה)/.test(value)) return {icon:ArrowDownToLine,tone:'income',accent:'green'};
  if (/(בנק|עו״ש)/.test(value)) return {icon:Landmark,accent:'blue'};
  return {icon:kind === 'personal' ? UserRound : kind === 'income' ? WalletCards : BriefcaseBusiness,accent:kind === 'income' ? 'green' : kind === 'personal' ? 'violet' : 'blue'};
}

export function FinanceDataIcon({label, scope, kind, tone, size = 19}: {label: string; scope?: string; kind?: string; tone?: FinanceTone; size?: number}) {
  const visual = financeVisual(label, kind);
  const resolvedTone = tone || visual.tone || (scope === 'personal' ? 'personal' : scope === 'business' ? 'business' : kind === 'income' || kind === 'collection' ? 'income' : kind === 'expense' ? 'warning' : 'neutral');
  const Icon = visual.icon;
  return <span className={`fn-data-icon fn-tone-${resolvedTone} fn-accent-${visual.accent}`} aria-hidden="true"><Icon size={size} strokeWidth={2}/></span>;
}
