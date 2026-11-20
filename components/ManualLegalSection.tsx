'use client';

import { useEffect, useRef, type ReactNode } from 'react';

export default function ManualLegalSection({ id, children }: { id: string; children: ReactNode }) {
  const section = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = section.current;
    if (!element) return;
    let frame = 0;

    const revealAnchor = () => {
      cancelAnimationFrame(frame);
      if (location.hash !== `#${id}`) return;
      frame = requestAnimationFrame(() => {
        element.focus({ preventScroll: true });
        element.scrollIntoView({ block: 'start', behavior: 'instant' });
      });
    };

    let closed: HTMLDetailsElement[] | undefined;
    const expandForPrint = () => {
      if (closed) return;
      closed = Array.from(element.querySelectorAll<HTMLDetailsElement>('details:not([open])'));
      closed.forEach(detail => { detail.open = true; });
    };

    const restoreAfterPrint = () => {
      closed?.forEach(detail => { detail.open = false; });
      closed = undefined;
    };

    revealAnchor();
    window.addEventListener('hashchange', revealAnchor);
    window.addEventListener('beforeprint', expandForPrint);
    window.addEventListener('afterprint', restoreAfterPrint);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('hashchange', revealAnchor);
      window.removeEventListener('beforeprint', expandForPrint);
      window.removeEventListener('afterprint', restoreAfterPrint);
    };
  }, [id]);

  return <section ref={section} className="manual-legal" id={id} tabIndex={-1} aria-labelledby={`${id}-titulo`}>
    {children}
  </section>;
}
