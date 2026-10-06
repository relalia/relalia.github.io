'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Report } from '@/lib/types';
import FindingCard from './FindingCard';
import SelectFilter from './SelectFilter';
import { evidenceById } from '@/lib/reports';

export default function FindingFilters({ report }: { report: Report }) {
  const [query, setQuery] = useState('');
  const [severity, setSeverity] = useState('all');
  const [context, setContext] = useState('all');
  const severities = useMemo(() => [...new Set(report.findings.map(f => f.severity).filter(Boolean))] as string[], [report]);
  const contexts = useMemo(() => [...new Set(report.findings.map(f => f.context).filter(Boolean))] as string[], [report]);
  useEffect(() => {
    const openTarget = () => {
      const id = decodeURIComponent(location.hash.slice(1));
      if (!report.findings.some(f => f.id === id)) return;
      setQuery(''); setSeverity('all'); setContext('all');
      requestAnimationFrame(() => {
        const target = document.getElementById(id);
        if (target instanceof HTMLDetailsElement) { target.open = true; target.scrollIntoView({block:'start'}); }
      });
    };
    let previousOpen: HTMLDetailsElement[] = [];
    const expandForPrint = () => { previousOpen = [...document.querySelectorAll<HTMLDetailsElement>('.finding')].filter(item => !item.open); previousOpen.forEach(item => item.open = true); };
    const restoreAfterPrint = () => previousOpen.forEach(item => item.open = false);
    openTarget();
    window.addEventListener('hashchange', openTarget);
    window.addEventListener('beforeprint', expandForPrint);
    window.addEventListener('afterprint', restoreAfterPrint);
    return () => { window.removeEventListener('hashchange', openTarget); window.removeEventListener('beforeprint', expandForPrint); window.removeEventListener('afterprint', restoreAfterPrint); };
  }, [report.id]);
  const filtered = report.findings.filter(f => {
    const haystack = [f.id, f.title, f.kind, f.description, f.hypothesis, f.expected, f.suggestion, f.verification, f.basis, f.status, f.context, ...f.evidenceIds.map(id => `${id} ${evidenceById.get(id)?.description || ''}`), ...(f.relatedIds || [])].join(' ').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('pt-BR');
    return haystack.includes(query.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('pt-BR')) && (severity === 'all' || f.severity === severity) && (context === 'all' || f.context === context);
  });
  return <>
    <div className="finding-tools">
      <label>Buscar por ID, texto ou EV<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Ex.: AC-037, leitura, EV-30" /></label>
      {report.module === 'Atlas' && <><SelectFilter label="Criticidade" value={severity} onChange={setSeverity} options={[{value:'all',label:'Todas'}, ...severities.map(value=>({value,label:value}))]} />
      <SelectFilter label="Contexto" value={context} onChange={setContext} options={[{value:'all',label:'Todos'}, ...contexts.map(value=>({value,label:value}))]} /></>}
    </div>
    <p className="result-count" aria-live="polite">{filtered.length} de {report.findings.length} achados</p>
    {report.findings.map(f => <FindingCard key={f.id} finding={f} report={report} hidden={!filtered.some(item=>item.id===f.id)} />)}
    {!filtered.length && <p className="empty">Nenhum achado corresponde aos filtros.</p>}
  </>;
}
