import type { Report } from '@/lib/types';
import { formatDate } from '@/lib/reports';
import Timeline from './Timeline';
import Downloads from './Downloads';
import FindingFilters from './FindingFilters';

export default function ReportView({ report }: { report: Report }) {
  return <div className="shell">
    <header><div className="brand"><span className="mark">A</span> Alia <span className="slash">/</span> Histórico de validação</div><span className="flag">Versão pública revisada</span></header>
    <section className="hero"><span className="eyebrow">Tri7 Alia · acompanhamento</span><h1>Quatro rodadas, um histórico consultável.</h1><p>Validações do VadeChat e Atlas, com achados pesquisáveis, vínculos de evidência e relatórios públicos para download.</p></section>
    <div className="notice"><strong>Versão pública.</strong> Dados pessoais e registrais foram retirados. Capturas do Atlas foram omitidas; os vínculos entre achados e evidências permanecem disponíveis.</div>
    <main className="layout"><Timeline activeId={report.id} /><article className="pane detail">
      <div className="kicker">{report.module} · {formatDate(report.date)}</div><h2>{report.title}</h2>
      <div className="meta"><span className="tag">{report.status}</span><span className="tag">{report.count}</span></div>
      <p className="summary">{report.summary}</p><ul className="highlights">{report.highlights.map(item => <li key={item}>{item}</li>)}</ul>
      <Downloads files={report.files} />
      <div className="section-head"><h3>Achados e resultados</h3><p>Abra um item para consultar o resumo e seus vínculos.</p></div>
      <FindingFilters report={report} />
      <p className="note">Os achados refletem a validação realizada. Fundamentos e conclusões normativas exigem revisão especializada.</p>
    </article></main>
    <footer>Histórico público de validação · Tri7 Alia</footer>
  </div>;
}
