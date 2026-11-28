export function investmentStale(asOf:string|null,today:string){
  if(!asOf||!/^\d{4}-\d{2}-\d{2}$/.test(asOf))return true;
  const stamp=Date.parse(asOf+'T00:00:00Z');
  return !Number.isFinite(stamp)||new Date(stamp).toISOString().slice(0,10)!==asOf||Date.parse(today)-stamp>30*86400000||asOf>today;
}
