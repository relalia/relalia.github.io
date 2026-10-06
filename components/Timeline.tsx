'use client';

import Link from 'next/link';
import { useState } from 'react';
import { formatDate, reports } from '@/lib/reports';
import SelectFilter from './SelectFilter';

export default function Timeline({ activeId }: { activeId: string }) {
  const [module, setModule] = useState('all');
  const modules = [...new Set(reports.map(report => report.module))];
  const visible = reports.filter(report => module === 'all' || report.module === module).sort((a, b) => b.date.localeCompare(a.date));
  return <aside className="pane timeline-pane" aria-label="Rodadas de validação">
    <div className="timeline-heading"><h2>Linha do tempo</h2><span>{reports.length} rodadas</span></div>
    <SelectFilter label="Módulo" value={module} onChange={setModule} options={[{value:'all',label:'Todos os módulos'}, ...modules.map(value => ({value,label:value}))]} />
    <nav className="timeline" aria-label="Relatórios">
      {visible.map(report => <Link className="node" aria-current={report.id === activeId ? 'page' : undefined} href={`/relatorios/${report.id}/`} key={report.id}>
        <time dateTime={report.date}>{formatDate(report.date)}{report.dateNote && ` · ${report.dateNote}`}</time>
        <strong>{report.title}</strong><small>{report.module} · {report.count}</small>
      </Link>)}
    </nav>
  </aside>;
}
