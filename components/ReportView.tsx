import type { Report } from '@/lib/types';
import { formatDate } from '@/lib/reports';
import Timeline from './Timeline';
import Downloads from './Downloads';
import FindingFilters from './FindingFilters';

export default function ReportView({ report }: { report: Report }) {
  return <div className="shell">
    <header><h1>Relalia: O Relatório da Alia</h1></header>
    <section className="intro" aria-label="Sobre o portal"><p>Validações do VadeChat e Atlas. Explore as rodadas, consulte os achados e acompanhe os retestes com seus documentos e evidências.</p></section>
    <main className="layout"><Timeline activeId={report.id} /><article className="pane detail">
      <div className="kicker">{report.module} · {formatDate(report.date)}</div><h2>{report.title}</h2>
      <div className="meta"><span className="tag">{report.status}</span><span className="tag">{report.count}</span></div>
      <p className="summary">{report.summary}</p><ul className="highlights">{report.highlights.map(item => <li key={item}>{item}</li>)}</ul>
      <Downloads files={report.files} />
      <div className="section-head"><h3>Achados e resultados</h3><p>Abra um item para consultar o resumo e seus vínculos.</p></div>
      <FindingFilters key={report.id} report={report} />
      <p className="note">{report.note || 'Os achados refletem a validação realizada. Propostas e critérios de verificação não representam funcionalidades implementadas nem retestes executados.'}</p>
    </article></main>
    <footer>Relalia · Histórico de validação da Tri7 Alia · <a href="/originals/SHA256SUMS.txt">Integridade dos originais (SHA-256)</a></footer>
  </div>;
}
