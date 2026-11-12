import type { Report } from '@/lib/types';
import { evidence, formatDate, timelineReports } from '@/lib/reports';
import { getBenchmark } from '@/lib/benchmark-data';
import { getComparison } from '@/lib/comparisons';
import Timeline from './Timeline';
import Downloads from './Downloads';
import FindingFilters from './FindingFilters';
import BenchmarkReport from './BenchmarkReport';
import BenchmarkComparisonReport from './BenchmarkComparisonReport';
import BenchmarkOverviewReport from './BenchmarkOverviewReport';
import ExecutiveBenchmarkResults from './ExecutiveBenchmarkResults';
import WeeklyBenchmarkReport from './WeeklyBenchmarkReport';
import LatencyBenchmarkResults from './LatencyBenchmarkResults';

export default function ReportView({ report }: { report: Report }) {
  const featured = report.id === 'estrutura-vadechat-2026-11-12'
    ? report.files.find(file => file.path === '/reports/estrutura-vadechat-2026-11-12.html')
    : undefined;
  return <div className="shell">
    <Timeline activeId={report.id} reports={timelineReports} intro={<section className="intro" aria-label="Sobre o portal"><p>Validações da plataforma Alia. Explore as rodadas, consulte os achados e acompanhe os retestes com seus documentos e evidências.</p></section>}>
    <article className="pane detail">
      <div className="kicker">{report.module} · {formatDate(report.date)}</div><h2>{report.title}</h2>
      {featured && <section className="featured-report" aria-label="Relatório completo">
        <iframe title="Relatório completo: Chat e GIRO" src={featured.path} sandbox="allow-scripts allow-downloads allow-modals allow-popups allow-popups-to-escape-sandbox" />
      </section>}
      {report.benchmarkSources ? <WeeklyBenchmarkReport report={report} sources={report.benchmarkSources}/> : report.overviewId ? <BenchmarkOverviewReport report={report}/> : report.comparisonId ? <BenchmarkComparisonReport report={report} data={getComparison(report.comparisonId)}/> : report.benchmarkId ? <BenchmarkReport report={report} benchmark={getBenchmark(report.benchmarkId)}/> : <>
      <div className="meta"><span className="tag">{report.status}</span><span className="tag">{report.count}</span></div>
      {report.latency ? <LatencyBenchmarkResults data={report.latency} note={report.note}/> : <>
        <p className="summary">{report.summary}</p>
        {report.executive ? <ExecutiveBenchmarkResults data={report.executive}/> : <ul className="highlights">{report.highlights.map(item => <li key={item}>{item}</li>)}</ul>}
      </>}
      <Downloads files={featured ? report.files.filter(file => file.path !== featured.path) : report.files} />
      {report.findings.length > 0 && <><div className="section-head"><h3>{report.executive ? 'UX do VadeChat' : 'Achados e resultados'}</h3><p>Abra um item para consultar o resumo e seus vínculos.</p></div>
      <FindingFilters key={report.id} report={report} evidence={evidence.filter(item => item.reportId === report.id)} /></>}
      {!report.latency && <p className="note">{report.note || 'Os achados refletem a validação realizada. Propostas e critérios de verificação não representam funcionalidades implementadas nem retestes executados.'}</p>}
      </>}
    </article></Timeline>
    <footer>Relalia · Histórico de validação da Tri7 Alia · <a href="/originals/SHA256SUMS.txt">Integridade dos originais (SHA-256)</a></footer>
  </div>;
}
