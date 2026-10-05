import Link from 'next/link';
import type { Finding, Report } from '@/lib/types';
import EvidenceGallery from './EvidenceGallery';

export default function FindingCard({ finding, report }: { finding: Finding; report: Report }) {
  const other = report.id === 'initial' ? 'retest' : report.id === 'retest' ? 'initial' : null;
  return <details className="finding" id={finding.id}>
    <summary><span className="finding-title"><em>{finding.id}</em> {finding.title}</span><span className="badge">{finding.severity || finding.kind || finding.status || finding.retest}</span></summary>
    <div className="finding-body">
      {finding.context && <p><strong>Contexto:</strong> {finding.context}</p>}
      <p><strong>Observado:</strong> {finding.description}</p>
      {finding.expected && <p><strong>Melhoria esperada:</strong> {finding.expected}</p>}
      {finding.verification && <p><strong>Como verificar:</strong> {finding.verification}</p>}
      {finding.relatedIds?.length ? <p><strong>Achados vinculados:</strong> {finding.relatedIds.join(', ')}</p> : null}
      <p><strong>Reteste:</strong> {finding.retest === 'pending' ? 'Pendente' : finding.retest === 'completed' ? 'Concluído' : 'Linha de base'}</p>
      <EvidenceGallery ids={finding.evidenceIds} />
      {other && <Link className="action compare" href={`/relatorios/${other}/#${finding.id}`}>{report.id === 'initial' ? 'Ver reteste da pergunta →' : '← Ver validação inicial'}</Link>}
    </div>
  </details>;
}
