import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { dateLabel } from '@/lib/financeFormatters';

export interface ConnectionHealth {
  checkedAt: string | null;
  connections: {id:string;name:string;status:string;expiryDate:string|null;daysUntilExpiry:number|null;lastSyncedAt:string|null;sourceDataDate:string|null;accountCount:number;needsReconsent:boolean;reconsentUrl:string}[];
}
export function ConnectionHealthBanner({data}: {data:ConnectionHealth}) {
  const attention=data.connections.filter(c=>c.needsReconsent);
  if(!attention.length)return null;
  const active=data.connections.filter(c=>c.status==='ACTIVE').length;
  return <aside className="fn-consent-banner fn-surface" aria-label="תוקף חיבורי הבנק" role="status" dir="rtl">
    <strong>יש הרשאות בנק שדורשות חידוש</strong>
    <p>{active>0 ? `${active} חיבורים עדיין פעילים. ` : ''}הרשאות ישנות עשויות להופיע לצד החיבור הנוכחי; לא נמחקו חשבונות או עסקאות.</p>
    <details><summary>פירוט ההרשאות ({attention.length})</summary>{attention.map(c=><div className="fn-list-row" key={c.id}>
      <span><strong><bdi>{c.name}</bdi> · {c.status==='EXPIRED'||c.daysUntilExpiry!==null&&c.daysUntilExpiry<=0 ? 'פג תוקף' : `נותרו ${c.daysUntilExpiry} ימים`}</strong>
        <small>{c.expiryDate ? `תוקף הרשאה: ${dateLabel(c.expiryDate,true)}` : 'תאריך תוקף לא התקבל מהספק'} · {c.accountCount ? `${c.accountCount} חשבונות מקושרים` : 'ללא חשבונות בנתונים הנוכחיים'}</small>
        <small>נתוני מקור: {c.sourceDataDate?dateLabel(c.sourceDataDate,true):'לא התקבל תאריך'} · סנכרון מוצלח: {c.lastSyncedAt?dateLabel(c.lastSyncedAt,true):'טרם אומת'}</small>
      </span><a className="fn-secondary" href="https://financy.open-finance.ai/settings" target="_blank" rel="noopener noreferrer">חידוש הרשאה ב־Financy ↗</a>
    </div>)}</details>
    <small>החידוש מתבצע במסך החיבורים הקיים של Financy, עם אישור שלך בבנק.</small>
  </aside>;
}
export default function FinanceConnectionHealth(){
  const query=useQuery<ConnectionHealth,Error>({queryKey:['finance','connection-health'],queryFn:()=>api.get<never,ConnectionHealth>('/connections/health'),staleTime:60000,refetchInterval:300000,retry:1});
  if(query.error)return <p className="fn-footnote" role="status">בדיקת תוקף חיבורי הבנק אינה זמינה כרגע. <button className="fn-link" onClick={()=>void query.refetch()}>לנסות שוב</button></p>;
  return query.data?<ConnectionHealthBanner data={query.data}/>:null;
}
