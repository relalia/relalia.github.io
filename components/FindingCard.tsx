import Link from 'next/link';
import type { Finding, Report } from '@/lib/types';
import EvidenceGallery from './EvidenceGallery';

export default function FindingCard({ finding, report, hidden }: { finding: Finding; report: Report; hidden?: boolean }) {
  const retestLabel = finding.retest.execution === 'performed' ? 'Executado' : finding.retest.execution === 'not-applicable' ? 'Ainda não aplicável à proposta' : 'Não executado';
  return <details className="finding" id={finding.id} hidden={hidden}>
    <summary><span className="finding-title"><em>{finding.id}</em> {finding.title}</span><span className="badge">{finding.severity ? `Criticidade ${finding.severity}` : finding.status}</span></summary>
    <div className="finding-body">
      {finding.context && <p><strong>Contexto:</strong> {finding.context}</p>}
      {finding.kind && <p><strong>Categoria:</strong> {finding.kind}</p>}
      {finding.sourceFields?.map(field => <p key={field.label}><strong>{field.label}:</strong> {field.value}</p>)}
      <p><strong>{finding.observationLabel || 'Observado'}:</strong> {finding.description}</p>
      {finding.hypothesis && <p className="hypothesis"><strong>Hipótese:</strong> {finding.hypothesis}</p>}
      {finding.hypothesis && finding.originalRecord && <details className="source-text"><summary>Texto original do checklist</summary><p>{finding.originalRecord.descricao}</p></details>}
      {finding.expected && <p><strong>Melhoria esperada:</strong> {finding.expected}</p>}
      {finding.suggestion && <p><strong>Sugestão registrada:</strong> {finding.suggestion}</p>}
      {finding.verification && <p><strong>Como verificar:</strong> {finding.verification}</p>}
      {finding.basis && <p><strong>Fundamento registrado:</strong> {finding.basis}</p>}
      {finding.relatedIds?.length ? <p className="related"><strong>Achados vinculados:</strong> {finding.relatedIds.map(id => <Link key={id} href={`/relatorios/${report.id}/#${id}`}>{id}</Link>)}</p> : null}
      <p><strong>Situação:</strong> {finding.status}</p><p><strong>Reteste:</strong> {retestLabel}{finding.retest.result && ` · Resultado registrado: ${finding.retest.result}`}</p>
      {!finding.evidenceIds.length && <p className="note">Sem evidência visual anexada a este item. Consulte também o documento da rodada.</p>}
      <EvidenceGallery ids={finding.evidenceIds} />
      <div className="finding-links"><Link href={`/relatorios/${report.id}/#${finding.id}`}>Link direto para {finding.id}</Link>{finding.comparisons?.map(comparison => <Link className="action compare" key={`${comparison.reportId}/${comparison.findingId}`} href={`/relatorios/${comparison.reportId}/#${comparison.findingId}`}>{comparison.label} →</Link>)}</div>
    </div>
  </details>;
}
