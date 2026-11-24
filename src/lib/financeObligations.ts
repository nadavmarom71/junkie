import type { FinancialState, Obligation } from '@/types/finance';

export type CardPurpose = 'personal' | 'business' | 'david_payment' | 'unclassified';
export const purposeLabels: Record<CardPurpose,string> = {personal:'אישי',business:'עסקי',david_payment:'תשלום עבור דוד',unclassified:'לסיווג / לבדיקה'};
export type ObligationItem = NonNullable<Obligation['items']>[number];
export function itemPurpose(item: ObligationItem): CardPurpose {
  // Older servers do not provide purchase-level metadata. Never infer it from
  // the card's bank, name or predominantly business/personal account purpose.
  return item.purpose && item.purpose in purposeLabels ? item.purpose : 'unclassified';
}
export function purposeTotals(items: ObligationItem[]) {
  const totals:Record<CardPurpose,number>={personal:0,business:0,david_payment:0,unclassified:0};
  for(const item of items)totals[itemPurpose(item)]+=(item.direction==='in'?-1:1)*Math.round(item.amount*100);
  return Object.fromEntries(Object.entries(totals).map(([key,value])=>[key,value/100])) as Record<CardPurpose,number>;
}
export interface CardCategoryGroup {
  key: string; label: string; icon: string; amount: number;
  charges: number; credits: number; items: ObligationItem[];
}
export function groupCardCategories(items: ObligationItem[]): CardCategoryGroup[] {
  const groups=new Map<string,CardCategoryGroup>();
  for(const item of items){
    const purpose=itemPurpose(item);
    const cockpit=(purpose==='business'||item.classification==='business')&&/(?:^|[.\n])\s*פרויקט:\s*קוקפיט(?:[.\s]|$)/u.test(item.note||'');
    const label=purpose==='david_payment'?'תשלום עבור דוד':cockpit?'קוקפיט':item.category?.trim()||purposeLabels[purpose];
    // Keep unrelated personal/business uses separate even when their category names match.
    const key=`${item.classification||purpose}:${label}`;
    const icon=label==='קוקפיט'?'🛠️':purpose==='david_payment'?'👤':/אלון|משפחה/.test(label)?'👨‍👦':/סופר|מזון לבית/.test(label)?'🛒':label==='דברים לבית'?'🏠':/פנאי|גיימינג/.test(label)?'🎮':/תרומ/.test(label)?'❤️':/מתנ/.test(label)?'🎁':/אוכל בחוץ/.test(label)?'🍗':/תחבורה/.test(label)?'🚗':/אחסון/.test(label)?'🌐':purpose==='unclassified'?'🔎':'💻';
    const group=groups.get(key)||{key,label,icon,amount:0,charges:0,credits:0,items:[]};
    const minor=Math.round(item.amount*100);
    if(item.direction==='in')group.credits+=minor;else group.charges+=minor;
    group.items.push(item);groups.set(key,group);
  }
  return [...groups.values()].map(group=>({...group,amount:(group.charges-group.credits)/100,charges:group.charges/100,credits:group.credits/100}));
}
export function groupCardObligations(state: Pick<FinancialState,'accounts'|'obligations'>) {
  const cards=new Map<string,{id:string;name:string;providerId?:string|null;checkingAccount:NonNullable<Obligation['card']>['checkingAccount'];obligations:Obligation[]}>();
  const other:Obligation[]=[];
  for(const obligation of state.obligations){
    const account=state.accounts.find(a=>a.type==='credit_card'&&obligation.source===`open_finance:${a.id}`);
    const card=obligation.card;
    if(!card&&!account){other.push(obligation);continue;}
    const id=card?.accountId||account!.id;
    const group=cards.get(id)||{id,name:card?.name||account!.name,providerId:card?.providerId||account?.providerId,checkingAccount:card?.checkingAccount||null,obligations:[]};
    if(card){group.name=card.name;group.providerId=card.providerId;group.checkingAccount=card.checkingAccount;}
    group.obligations.push(obligation);cards.set(id,group);
  }
  return {cards:[...cards.values()],other};
}
