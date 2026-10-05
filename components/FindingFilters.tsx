'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Report } from '@/lib/types';
import FindingCard from './FindingCard';

export default function FindingFilters({ report }: { report: Report }) {
  const [query, setQuery] = useState('');
  const [severity, setSeverity] = useState('all');
  const [context, setContext] = useState('all');
  const severities = useMemo(() => [...new Set(report.findings.map(f => f.severity).filter(Boolean))] as string[], [report]);
  const contexts = useMemo(() => [...new Set(report.findings.map(f => f.context).filter(Boolean))] as string[], [report]);
  useEffect(() => {
    const openTarget = () => {
      const id = decodeURIComponent(location.hash.slice(1));
      const target = id ? document.getElementById(id) : null;
      if (target instanceof HTMLDetailsElement) target.open = true;
    };
    const expandForPrint = () => document.querySelectorAll<HTMLDetailsElement>('.finding').forEach(item => item.open = true);
    openTarget();
    window.addEventListener('hashchange', openTarget);
    window.addEventListener('beforeprint', expandForPrint);
    return () => { window.removeEventListener('hashchange', openTarget); window.removeEventListener('beforeprint', expandForPrint); };
  }, [report.id]);
  const filtered = report.findings.filter(f => {
    const haystack = [f.id, f.title, f.kind, f.description, f.context, ...f.evidenceIds, ...(f.relatedIds || [])].join(' ').toLocaleLowerCase('pt-BR');
    return haystack.includes(query.toLocaleLowerCase('pt-BR')) && (severity === 'all' || f.severity === severity) && (context === 'all' || f.context === context);
  });
  return <>
    <div className="finding-tools">
      <label>Buscar por ID, texto ou EV<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Ex.: AC-037, leitura, EV-30" /></label>
      {report.module === 'Atlas' && <><label>Criticidade<select value={severity} onChange={event => setSeverity(event.target.value)}><option value="all">Todas</option>{severities.map(value => <option key={value}>{value}</option>)}</select></label>
      <label>Contexto<select value={context} onChange={event => setContext(event.target.value)}><option value="all">Todos</option>{contexts.map(value => <option key={value}>{value}</option>)}</select></label></>}
    </div>
    <p className="result-count" aria-live="polite">{filtered.length} de {report.findings.length} achados</p>
    {filtered.length ? filtered.map(f => <FindingCard key={f.id} finding={f} report={report} />) : <p className="empty">Nenhum achado corresponde aos filtros.</p>}
  </>;
}
