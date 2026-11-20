'use client';

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

const tabs = [
  { panelId: 'resumo-da-semana', label: 'Resumo da semana' },
  { panelId: 'teste-manual-cartorario', label: 'Teste jurídico cartorário manual' },
] as const;

function fragmentTarget(group: HTMLElement) {
  if (!location.hash) return { index: 0 };
  let id: string;
  try {
    id = decodeURIComponent(location.hash.slice(1));
  } catch {
    return null;
  }
  const target = document.getElementById(id);
  if (!target || !group.contains(target)) return null;

  const panel = target.closest('.weekly-tab-panel');
  const index = tabs.findIndex(({ panelId }) => panelId === panel?.id);
  if (index < 0) return null;
  return { index, anchor: target === panel ? undefined : target };
}

export default function WeeklyReportTabs({ summary, manual }: { summary: ReactNode; manual: ReactNode }) {
  const [selected, setSelected] = useState(0);
  const group = useRef<HTMLDivElement>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const manualPanel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = group.current;
    if (!container) return;
    let frame = 0;

    const syncLocation = (initial = false) => {
      cancelAnimationFrame(frame);
      const match = fragmentTarget(container);
      if (!match) return;
      const { index, anchor } = match;
      setSelected(index);

      const revealTab = initial && Boolean(location.hash);
      if (!anchor && !revealTab && !container.contains(document.activeElement)) return;
      frame = requestAnimationFrame(() => {
        if (anchor) {
          if (anchor.tabIndex < 0 && !anchor.hasAttribute('tabindex')) anchor.tabIndex = -1;
          anchor.focus({ preventScroll: true });
          anchor.scrollIntoView({ block: 'start', behavior: 'instant' });
          return;
        }
        const tab = buttons.current[index];
        tab?.focus({ preventScroll: true });
        if (revealTab) tab?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
      });
    };
    const syncHistory = () => syncLocation();

    let closed: HTMLDetailsElement[] | undefined;
    function expandForPrint() {
      if (closed || !manualPanel.current) return;
      closed = Array.from(manualPanel.current.querySelectorAll<HTMLDetailsElement>('details:not([open])'));
      closed.forEach(detail => { detail.open = true; });
    }
    function restoreAfterPrint() {
      closed?.forEach(detail => { detail.open = false; });
      closed = undefined;
    }

    syncLocation(true);
    window.addEventListener('hashchange', syncHistory);
    window.addEventListener('popstate', syncHistory);
    window.addEventListener('beforeprint', expandForPrint);
    window.addEventListener('afterprint', restoreAfterPrint);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('hashchange', syncHistory);
      window.removeEventListener('popstate', syncHistory);
      window.removeEventListener('beforeprint', expandForPrint);
      window.removeEventListener('afterprint', restoreAfterPrint);
    };
  }, []);

  function select(index: number) {
    if (index === selected) return;
    setSelected(index);
    const hash = `#${tabs[index].panelId}`;
    if (location.hash !== hash) history.pushState(null, '', hash);
  }

  function moveTab(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    let next: number;
    switch (event.key) {
      case 'ArrowLeft': next = (index + tabs.length - 1) % tabs.length; break;
      case 'ArrowRight': next = (index + 1) % tabs.length; break;
      case 'Home': next = 0; break;
      case 'End': next = tabs.length - 1; break;
      default: return;
    }
    event.preventDefault();
    select(next);
    buttons.current[next]?.focus();
  }

  return <div ref={group}>
    <div className="weekly-report-tabs" role="tablist" aria-label="Relatórios da edição">
      {tabs.map(({ panelId, label }, index) => <button
        key={panelId}
        ref={button => { buttons.current[index] = button; }}
        type="button"
        role="tab"
        id={`${panelId}-tab`}
        aria-controls={panelId}
        aria-selected={selected === index}
        tabIndex={selected === index ? 0 : -1}
        onClick={() => select(index)}
        onKeyDown={event => moveTab(event, index)}
      >{label}</button>)}
    </div>
    {tabs.map(({ panelId }, index) => <div
      key={panelId}
      ref={index === 1 ? manualPanel : undefined}
      className="weekly-tab-panel"
      role="tabpanel"
      id={panelId}
      aria-labelledby={`${panelId}-tab`}
      tabIndex={0}
      hidden={selected !== index}
    >{index === 0 ? summary : manual}</div>)}
  </div>;
}
