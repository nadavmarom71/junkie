import { useCallback, useEffect, useId, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { X, ArrowLeft, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Trust } from '@/types/finance';

export function TrustBadge({status, children}: {status: Trust; children?: ReactNode}) {
  return <span className={`fn-trust fn-trust-${status}`}>{children || {confirmed: 'לפי הרישום', estimated: 'אומדן', assumed: 'הנחה', unknown: 'חסר מידע'}[status]}</span>;
}
export function FinanceError({error, retry}: {error: Error | null; retry?: () => void}) {
  if (!error) return null;
  return <div className="fn-error" role="alert"><strong>לא הצלחנו לטעון את המידע.</strong><span>{error.message}</span>{retry && <button className="fn-link" onClick={retry}><RefreshCw size={15}/> לנסות שוב</button>}</div>;
}
export function Loading({label = 'טוען את הנתונים שלך…'}: {label?: string}) {
  return <div className="fn-loading" role="status"><span className="fn-loading-line"/><span className="fn-loading-line"/><p>{label}</p></div>;
}
export function Empty({title, children}: {title: string; children: ReactNode}) {
  return <div className="fn-empty"><strong>{title}</strong><p>{children}</p></div>;
}
export function LegacyLink({to, children}: {to: string; children: ReactNode}) { return <Link className="fn-link" to={to}>{children}<ArrowLeft size={15}/></Link>; }

// Native modal supplies focus trapping, inert background, Escape, and focus restoration.
// Touch gestures are layered on top without replacing those accessible fallbacks.
export function FinanceSheet({open, onClose, title, children}: {open: boolean; onClose: () => void; title: string; children: ReactNode}) {
  const ref = useRef<HTMLDialogElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const closeTimer = useRef<number | null>(null);
  const drag = useRef({active:false,dragging:false,pointerId:-1,startY:0,lastY:0,lastAt:0,velocity:0,translate:0});

  const clearTimer = useCallback(() => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
  },[]);
  const resetSurface = useCallback(() => {
    const dialog=ref.current;
    if(!dialog)return;
    clearTimer();
    dialog.style.transition='';
    dialog.style.transform='';
    delete dialog.dataset.dragging;
    delete dialog.dataset.settling;
    drag.current={active:false,dragging:false,pointerId:-1,startY:0,lastY:0,lastAt:0,velocity:0,translate:0};
  },[clearTimer]);
  const begin = useCallback((y:number,pointerId=-1) => {
    const now=performance.now();
    drag.current={active:true,dragging:false,pointerId,startY:y,lastY:y,lastAt:now,velocity:0,translate:0};
  },[]);
  const move = useCallback((y:number) => {
    const dialog=ref.current, state=drag.current;
    if(!dialog||!state.active)return false;
    const now=performance.now(), delta=Math.max(0,y-state.startY),elapsed=now-state.lastAt;
    if(elapsed>0)state.velocity=(y-state.lastY)/elapsed;
    state.lastY=y;state.lastAt=now;
    if(!state.dragging&&delta<6)return false;
    if(!state.dragging){state.dragging=true;dialog.dataset.dragging='true';dialog.style.transition='none';}
    state.translate=delta;
    dialog.style.transform=`translate3d(0, ${delta}px, 0)`;
    return true;
  },[]);
  const finish = useCallback(() => {
    const dialog=ref.current,state=drag.current;
    if(!dialog||!state.active)return;
    const distance=state.translate,height=dialog.getBoundingClientRect().height;
    const shouldDismiss=state.dragging&&(distance>=height*.38||(distance>=28&&state.velocity>=.75));
    state.active=false;
    if(!state.dragging){resetSurface();return;}
    delete dialog.dataset.dragging;dialog.dataset.settling='true';
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    dialog.style.transition=reduced?'none':'transform 220ms cubic-bezier(.22,1,.36,1)';
    dialog.style.transform=shouldDismiss?'translate3d(0, calc(100% + 32px), 0)':'translate3d(0, 0, 0)';
    clearTimer();
    closeTimer.current=window.setTimeout(()=>{
      if(shouldDismiss)onClose();
      resetSurface();
    },reduced?0:230);
  },[clearTimer,onClose,resetSurface]);

  useEffect(() => {
    const dialog = ref.current;
    if (open && dialog && !dialog.open) {resetSurface();dialog.showModal();}
    if (!open && dialog?.open) {resetSurface();dialog.close();}
  }, [open,resetSurface]);
  useEffect(()=>()=>clearTimer(),[clearTimer]);

  useEffect(()=>{
    if(!open)return;
    const surface=scrollRef.current;
    if(!surface)return;
    const touchStart=(event:TouchEvent)=>{if(event.touches.length===1)begin(event.touches[0].clientY);};
    const touchMove=(event:TouchEvent)=>{
      if(event.touches.length!==1||!drag.current.active)return;
      const y=event.touches[0].clientY;
      if(!drag.current.dragging&&surface.scrollTop>0){drag.current.startY=y;drag.current.lastY=y;drag.current.lastAt=performance.now();return;}
      if(y<=drag.current.startY&&!drag.current.dragging)return;
      if(move(y))event.preventDefault();
    };
    const touchEnd=()=>finish();
    surface.addEventListener('touchstart',touchStart,{passive:true});
    surface.addEventListener('touchmove',touchMove,{passive:false});
    surface.addEventListener('touchend',touchEnd,{passive:true});
    surface.addEventListener('touchcancel',touchEnd,{passive:true});
    return ()=>{surface.removeEventListener('touchstart',touchStart);surface.removeEventListener('touchmove',touchMove);surface.removeEventListener('touchend',touchEnd);surface.removeEventListener('touchcancel',touchEnd);};
  },[begin,finish,move,open]);

  const pointerDown=(event:ReactPointerEvent<HTMLDivElement>)=>{
    if(event.pointerType==='touch'||event.button!==0)return;
    const surface=scrollRef.current,target=event.target as Element;
    if(!surface||(surface.scrollTop>0&&!target.closest('[data-sheet-drag-zone]')))return;
    begin(event.clientY,event.pointerId);surface.setPointerCapture(event.pointerId);
  };
  const pointerMove=(event:ReactPointerEvent<HTMLDivElement>)=>{
    if(event.pointerType==='touch'||drag.current.pointerId!==event.pointerId)return;
    if(move(event.clientY))event.preventDefault();
  };
  const pointerEnd=(event:ReactPointerEvent<HTMLDivElement>)=>{
    if(event.pointerType==='touch'||drag.current.pointerId!==event.pointerId)return;
    finish();
  };

  return <dialog ref={ref} className="fn-sheet fn-theme" dir="rtl" aria-labelledby={titleId} onCancel={event=>{event.preventDefault();onClose();}} onClose={()=>{if(open)onClose();}} onClick={e => {if (e.target === e.currentTarget) onClose();}}>
    <div ref={scrollRef} className="fn-sheet-inner" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd}>
      <div className="fn-sheet-handle" data-sheet-drag-zone aria-hidden="true"/>
      <header className="fn-section-head" data-sheet-drag-zone><h2 id={titleId}>{title}</h2><button className="fn-icon fn-sheet-close" onClick={onClose} aria-label="סגירת החלונית"><X size={21}/></button></header>{children}
    </div>
  </dialog>;
}
