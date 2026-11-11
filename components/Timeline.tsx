'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { PointerEvent, ReactNode } from 'react';
import type { TimelineReport } from '@/lib/types';
import SelectFilter from './SelectFilter';

const mobileQuery = '(max-width: 800px)';
const isMobile = () => window.matchMedia(mobileQuery).matches;
function subscribeToViewport(onChange: () => void) {
  const query = window.matchMedia(mobileQuery);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

export default function Timeline({ activeId, intro, children, reports }: { activeId: string; intro: ReactNode; children: ReactNode; reports: TimelineReport[] }) {
  const mobile = useSyncExternalStore(subscribeToViewport, isMobile, () => false);
  const [module, setModule] = useState('all');
  const [open, setOpen] = useState(false);
  const drawer = useRef<HTMLDialogElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLElement>(null);
  const activeCard = useRef<HTMLAnchorElement>(null);
  const gesture = useRef<{ id: number; x: number; y: number; dragging: boolean } | null>(null);

  useEffect(() => {
    if (!mobile) drawer.current?.close();
  }, [mobile]);

  useEffect(() => {
    if ((mobile && !open) || !list.current || !activeCard.current) return;
    const viewport = list.current.getBoundingClientRect();
    const card = activeCard.current.getBoundingClientRect();
    const inset = 6;
    if (card.top < viewport.top + inset) {
      list.current.scrollTop += card.top - viewport.top - inset;
    } else if (card.bottom > viewport.bottom - inset) {
      list.current.scrollTop += card.bottom - viewport.bottom + inset;
    }
  }, [activeId, mobile, module, open]);

  function openDrawer() {
    if (!drawer.current || drawer.current.open) return;
    drawer.current.showModal();
    setOpen(true);
  }

  function closeDrawer() {
    drawer.current?.close();
  }

  function startDrag(event: PointerEvent<HTMLElement>) {
    if (!event.isPrimary || event.button !== 0 || !event.currentTarget.contains(event.target as Node)) return;
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, dragging: false };
  }

  function moveDrag(event: PointerEvent<HTMLElement>) {
    const start = gesture.current;
    if (start?.id !== event.pointerId) return;
    if ((event.buttons & 1) === 0) { resetDrag(); return; }
    const distance = start.x - event.clientX;
    const vertical = Math.abs(start.y - event.clientY);
    if (!start.dragging) {
      if (Math.max(Math.abs(distance), vertical) < 10) return;
      if (distance <= vertical) {
        gesture.current = null;
        return;
      }
      start.dragging = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.dataset.dragging = '';
    }
    event.currentTarget.style.setProperty('--drawer-drag', `${Math.min(0, -distance)}px`);
  }

  function finishDrag(event: PointerEvent<HTMLElement>) {
    const start = gesture.current;
    if (start?.id !== event.pointerId) return;
    if (event.type === 'lostpointercapture' && event.target !== event.currentTarget) return;
    resetDrag();
    if (event.type === 'pointerup' && start.dragging && start.x - event.clientX >= Math.min(96, event.currentTarget.clientWidth * 0.28)) {
      closeDrawer();
    }
  }

  function resetDrag() {
    gesture.current = null;
    if (!panel.current) return;
    delete panel.current.dataset.dragging;
    panel.current.style.removeProperty('--drawer-drag');
  }

  const modules = [...new Set(reports.map(report => report.module))];
  const moduleOptions = [{value:'all',label:'Todos os módulos'}, ...modules.map(value => ({value,label:value}))];
  const visible = reports.filter(report => module === 'all' || report.module === module).sort((a, b) => b.date.localeCompare(a.date));
  const timeline = <>
    <div className="timeline-heading">
      <div><h2 id="timeline-title">Linha do tempo</h2><span>{reports.length} rodadas</span></div>
      {mobile && <button className="timeline-toggle" type="button" aria-label="Fechar linha do tempo" onClick={closeDrawer}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
      </button>}
    </div>
    <SelectFilter label="Módulo" value={module} onChange={setModule} options={moduleOptions} portalContainer={open ? drawer.current : undefined} />
    <nav ref={list} className="timeline" aria-label="Relatórios" tabIndex={0}>
      <div className="timeline-list">
        {visible.map(report => <Link ref={report.id === activeId ? activeCard : undefined} className="node" aria-current={report.id === activeId ? 'page' : undefined} href={`/relatorios/${report.id}/`} prefetch={false} onNavigate={mobile ? closeDrawer : undefined} key={report.id}>
          <time dateTime={report.date}>{report.dateLabel}{report.dateNote && ` · ${report.dateNote}`}</time>
          <strong>{report.title}</strong><small>{report.module} · {report.count}</small>
        </Link>)}
      </div>
    </nav>
  </>;

  return <>
    <header className="report-header">
      <button ref={trigger} className="timeline-toggle timeline-open" type="button" aria-label="Abrir linha do tempo" aria-haspopup="dialog" aria-controls="timeline-drawer" aria-expanded={open} onClick={openDrawer}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
      </button>
      <h1>Relalia: O Relatório da Alia</h1>
    </header>
    {intro}
    <main className="layout">
      {!mobile && <aside className="pane timeline-pane" aria-label="Rodadas de validação">{timeline}</aside>}
      {children}
    </main>
    <dialog className="timeline-drawer" id="timeline-drawer" ref={drawer} aria-labelledby="timeline-title"
      onClose={event => {
        resetDrag();
        setOpen(event.currentTarget.open);
        if (mobile && !event.currentTarget.open) trigger.current?.focus({ preventScroll: true });
      }}
      onClick={event => { if (event.target === event.currentTarget) closeDrawer(); }}>
      {mobile && <div className="timeline-drawer-panel" ref={panel} onPointerDown={startDrag} onPointerMove={moveDrag}
        onPointerUp={finishDrag} onPointerCancel={finishDrag} onLostPointerCapture={finishDrag}>{timeline}</div>}
    </dialog>
  </>;
}
