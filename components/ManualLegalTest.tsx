import type { ManualLegalTest as LegalTest } from '@/lib/types';

const modes = [
  { key: 'agil', label: 'Ágil' },
  { key: 'pleno', label: 'Pleno' },
] as const;
const finalScore = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const itemScore = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export default function ManualLegalTest({ test }: { test: LegalTest }) {
  const total = test.questions.length;
  const fullAhead = test.questions.filter(({ scores }) => scores.pleno > scores.agil).length;
  const ties = test.questions.filter(({ scores }) => scores.pleno === scores.agil).length;
  const incidentMax = test.incidents.reduce((max, { counts }) => Math.max(max, counts.agil, counts.pleno), total);

  return <section className="manual-legal" aria-labelledby="teste-manual-cartorario-titulo">
    <h3 id="teste-manual-cartorario-titulo">Teste jurídico cartorário manual</h3>
    <p className="manual-legal-context">{test.methodology}</p>
    <dl className="manual-legal-scores" aria-label="Notas finais do teste manual">
      {modes.map(({ key, label }) => <div key={key} className={`manual-legal-${key}`}>
        <dt>{label}</dt>
        <dd>{finalScore.format(test.finalScores[key])} <small>/ 10</small></dd>
      </div>)}
      <div>
        <dt>Pleno com nota maior</dt>
        <dd>{fullAhead} <small>/ {total} perguntas</small><small className="manual-legal-ties">{ties} {ties === 1 ? 'empate' : 'empates'} em nota</small></dd>
      </div>
    </dl>
    <p className="manual-legal-context">{test.scoringNote}</p>

    <figure className="manual-legal-chart">
      <figcaption><h4>Ocorrências por perfil</h4><small>Escala de 0 a {incidentMax}</small></figcaption>
      <dl>
        {test.incidents.map(({ label, counts }) => <div className="manual-legal-incident" key={label}>
          <dt>{label}</dt>
          {modes.map(mode => <dd key={mode.key} className={`manual-legal-${mode.key}`}>
            <span>{mode.label}</span>
            <span className="manual-legal-track" aria-hidden="true"><span style={{ width: `${100 * counts[mode.key] / incidentMax}%` }}/></span>
            <strong>{counts[mode.key]}</strong>
          </dd>)}
        </div>)}
      </dl>
      <p>{test.evidenceNote}</p>
    </figure>

    <h4>Correções prioritárias e critérios de aceite</h4>
    <ol className="manual-legal-actions">
      {test.recommendations.map(({ title, change, acceptance }) => <li key={title}>
        <h5>{title}</h5>
        <p>{change}</p>
        <p><strong>Aceite.</strong> {acceptance}</p>
      </li>)}
    </ol>

    <h4>Achados por pergunta</h4>
    <div className="manual-legal-questions">
      {test.questions.map(({ number, title, scores, findings, expected, sourcePages }) => <details key={number}>
        <summary>
          <span className="manual-legal-question-line">
            <strong>{number}. {title}</strong>
            <span className="manual-legal-item-scores">
              {modes.map(({ key, label }) => <span key={key} className={`manual-legal-${key}`}>{label} <strong>{itemScore.format(scores[key])}</strong></span>)}
            </span>
          </span>
        </summary>
        <div className="manual-legal-question-body">
          {modes.map(({ key, label }) => <p key={key}><strong>{label}.</strong> {findings[key]}</p>)}
          <p><strong>Esperado no teste.</strong> {expected}</p>
          <small>PDF de origem, p. {sourcePages.join('–')}.</small>
        </div>
      </details>)}
    </div>
    <p className="manual-legal-retest"><strong>Próximo reteste.</strong> {test.retest}</p>
    <p className="manual-legal-context"><strong>Fonte.</strong> {test.source}</p>
  </section>;
}
