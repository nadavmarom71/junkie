export interface FinanceSyncResult {
  dataChanged?:boolean;
  changes?:{transactionsAdded:number;transactionsUpdated:number;accountsAdded:number;accountsUpdated:number};
}
export function refreshChangeLabel(result:FinanceSyncResult) {
  if(result.dataChanged===false)return 'לא התקבל שינוי בנתונים.';
  if(!result.changes)return 'הנתונים הזמינים נטענו מחדש.';
  const changes=result.changes;
  return `תנועות חדשות: ${changes.transactionsAdded} · תנועות שהתעדכנו: ${changes.transactionsUpdated} · חשבונות שהתעדכנו: ${changes.accountsAdded+changes.accountsUpdated}.`;
}
