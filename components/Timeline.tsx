'use client';

import Link from 'next/link';
import { useState } from 'react';
import { formatDate, reports } from '@/lib/reports';
import type { Module } from '@/lib/types';

export default function Timeline({ activeId }: { activeId: string }) {
  const [module, setModule] = useState<Module | 'all'>('all');
  const visible = reports.filter(report => module === 'all' || report.module === module).sort((a, b) => b.date.localeCompare(a.date));
  return <aside className="pane timeline-pane" aria-label="Rodadas de validação">
    <h2>Linha do tempo</h2>
    <label className="field-label" htmlFor="module-filter">Módulo</label>
    <select id="module-filter" value={module} onChange={event => setModule(event.target.value as Module | 'all')}>
      <option value="all">Todos os módulos</option><option value="VadeChat">VadeChat</option><option value="Atlas">Atlas</option>
    </select>
    <nav className="timeline" aria-label="Relatórios">
      {visible.map(report => <Link className="node" aria-current={report.id === activeId ? 'page' : undefined} href={`/relatorios/${report.id}/`} key={report.id}>
        <time dateTime={report.date}>{formatDate(report.date)}{report.id === 'atlas' ? ' · testes de 28 e 30/09' : ''}</time>
        <strong>{report.title}</strong><small>{report.module} · {report.count}</small>
      </Link>)}
    </nav>
  </aside>;
}
