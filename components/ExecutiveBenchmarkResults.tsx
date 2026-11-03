import type { ExecutiveBenchmark } from '@/lib/types';
import { formatDate } from '@/lib/reports';

const score = (value: number, digits = 2) => value.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const count = (value: number) => value.toLocaleString('pt-BR');

export default function ExecutiveBenchmarkResults({ data }: { data: ExecutiveBenchmark }) {
  return <section className="benchmark executive-results" id="benchmark-resultados" aria-labelledby="executive-heading">
    <div className="section-head"><h3 id="executive-heading">Resultados do benchmark</h3><p>Rodada datada de {formatDate(data.runDate)} na fonte · {data.questions} perguntas · {data.modes.reduce((n, mode) => n + mode.n, 0)} embates comparáveis · escala 0–{data.scaleMax}</p></div>
    <p className="executive-source-title">{data.title}</p>
    {data.pendingNotice && <p className="benchmark-caveat"><strong>{data.pendingNotice}</strong></p>}
    <div className="executive-cards">
      {data.modes.map(mode => <article className="executive-card" key={mode.key} aria-labelledby={`executive-${mode.key}`}>
        <div className="executive-card-heading"><h4 id={`executive-${mode.key}`}>VadeChat {mode.label}</h4><span className="tag">n = {mode.n}</span></div>
        <div className="executive-score"><strong>{score(mode.vcMean)}</strong><span>/ {data.scaleMax}</span><span className="executive-difference">+{score(mode.vcMean - mode.opponentMean)} pontos</span></div>
        <p className="executive-against">{data.opponent}: <strong>{score(mode.opponentMean)}</strong> / {data.scaleMax}</p>
        {[{ label: `VadeChat ${mode.label}`, value: mode.vcMean, vc: true }, { label: `${data.opponent} contra ${mode.label}`, value: mode.opponentMean, vc: false }].map(series => <div className="executive-bar" key={series.label}>
          <div><span>{series.label}</span><strong>{score(series.value)}</strong></div><div className="executive-track" aria-hidden="true"><span className={series.vc ? 'executive-vc' : 'executive-opponent'} style={{ width: `${series.value / data.scaleMax * 100}%` }} /></div>
        </div>)}
        <p className="executive-outcome"><strong>{mode.wins} {mode.wins === 1 ? 'vitória' : 'vitórias'} · {mode.ties} {mode.ties === 1 ? 'empate' : 'empates'} · {mode.losses} {mode.losses === 1 ? 'derrota' : 'derrotas'}</strong><br/>Resultados do VadeChat · cobertura {mode.n}/{mode.coverageTotal}</p>
      </article>)}
    </div>
    <p className="executive-caption">{data.precisionNote}</p>
    <div className="benchmark-table-wrap" role="region" aria-label="Médias e resultados exatos" tabIndex={0}><table>
      <caption>Médias e resultados originais · adversário separado contra cada modo</caption>
      <thead><tr><th scope="col">Modo</th><th scope="col">VadeChat</th><th scope="col">{data.opponent}</th><th scope="col">Diferença</th><th scope="col">Vitórias / empates / derrotas</th><th scope="col">Comparáveis</th></tr></thead>
      <tbody>{data.modes.map(mode => <tr key={mode.key}><th scope="row">{mode.label}</th><td>{score(mode.vcMean)}</td><td>{score(mode.opponentMean)}</td><td>+{score(mode.vcMean - mode.opponentMean)}</td><td>{mode.wins} / {mode.ties} / {mode.losses}</td><td>{mode.n}/{mode.coverageTotal}</td></tr>)}</tbody>
    </table></div>
    <div className="benchmark-caveat">{data.caveat}</div>

    <section className="benchmark-section" aria-labelledby="executive-actions"><h4 id="executive-actions">O que merece atenção da equipe de IA</h4><p className="executive-caption">Síntese editorial dos agregados, sem novo julgamento.</p>
      <div className="executive-insights">{data.insights.map(item => <article key={item.title}><h5>{item.title}</h5><p>{item.text}</p></article>)}</div>
    </section>

    <section className="benchmark-section" aria-labelledby="executive-criteria"><h4 id="executive-criteria">Onde os pontos foram obtidos</h4>
      <div className="benchmark-table-wrap" role="region" aria-label="Médias por critério" tabIndex={0}><table>
        <caption>Médias por critério · VadeChat / adversário</caption><thead><tr><th scope="col">Critério</th>{data.modes.map(mode => <th scope="col" key={mode.key}>{mode.label}<small>n = {mode.n} em cada critério</small></th>)}</tr></thead>
        <tbody>{data.modes[0].criteria.map((criterion, index) => <tr key={criterion.code}><th scope="row">{criterion.code} · {criterion.label}<small>Máximo: {criterion.max}</small></th>{data.modes.map(mode => <td key={mode.key}>{score(mode.criteria[index].vc, 1)} / {score(mode.criteria[index].opponent, 1)}</td>)}</tr>)}</tbody>
      </table></div>
    </section>

    <details className="executive-detail"><summary>Qualidade, revisão e papéis da avaliação</summary>
      <p>Vencer por pontos não significa classificação Conforme. As revisões são contabilizadas separadamente e não substituem as notas originais.</p>
      <div className="benchmark-table-wrap" role="region" aria-label="Qualidade e revisão" tabIndex={0}><table><caption>Indicadores informados · V = VadeChat, A = adversário</caption><thead><tr><th>Modo</th><th>Contradições essenciais V / A</th><th>Abstenções V / A</th><th>Revisões</th><th>Contestações / decisões pendentes</th></tr></thead><tbody>{data.modes.map(mode => <tr key={mode.key}><th scope="row">{mode.label}</th><td>{mode.contradictionsVc} / {mode.contradictionsOpponent}</td><td>{mode.abstentionsVc} / {mode.abstentionsOpponent}</td><td>{mode.reviewsCompleted}/{mode.reviewsTotal}<small>{mode.pendingReviews} pendentes</small></td><td>{mode.contests} / {mode.pendingDecisions}</td></tr>)}</tbody></table></div>
      <dl className="executive-roles">{data.roles.map(role => <div key={role.role}><dt>{role.role}</dt><dd><strong>{role.model || 'Modelo interno não informado'}</strong><br/>{role.platform}{role.note && <p>{role.note}</p>}</dd></div>)}</dl>
    </details>

    <details className="executive-detail"><summary>Operação e consumo disponíveis</summary>
      <div className="benchmark-table-wrap" role="region" aria-label="Consumo por papel" tabIndex={0}><table><caption>Dados informados pelo provedor · incluem falhas com consumo registrado</caption><thead><tr><th>Papel</th><th>Tentativas / falhas ou incertas</th><th>Tokens entrada / saída / total</th><th>US$ informado</th><th>Soma das durações</th></tr></thead><tbody>{data.operations.rows.map(row => <tr key={row.role}><th scope="row">{row.role}</th><td>{row.attempts} / {row.failedOrUncertain}</td><td>{count(row.tokensIn)} / {count(row.tokensOut)} / {count(row.tokensTotal)}</td><td>{score(row.providerCostUsd, 6)}</td><td>{score(row.seconds, 1)} s</td></tr>)}</tbody></table></div>
      {data.operations.generation.map(row => <p key={row.mode}><strong>Geração Tri7 {row.mode}:</strong> {row.attempts} tentativas; tokens, duração e custo não informados.</p>)}
      <p>{data.operations.note}</p><p><strong>Controle local OpenRouter:</strong> orçamento US$ {score(data.operations.budget.limitUsd, 6)}; consumo/reservas US$ {score(data.operations.budget.consumedReservedUsd, 6)}; saldo após reservas US$ {score(data.operations.budget.remainingUsd, 6)}. Inclui todas as tentativas e planos anteriores; não representa saldo consultado da conta do provedor.</p>
    </details>

    <details className="executive-detail"><summary>Limites e rastreabilidade da síntese</summary>
      <ul>{data.limitations.map(item => <li key={item}>{item}</li>)}</ul>
      <p>Fonte: <a href={data.source.path} target="_blank" rel="noreferrer">PDF executivo original · {data.source.pages} páginas</a>. Resultados: p. 1 e conclusões da p. 3; critérios e revisão: p. 2; consumo: p. 3.</p>
      <p>Série: <code>{data.source.series}</code><br/>Rodada: <code>{data.source.runId}</code><br/>Execução informada no rodapé: <code>{data.source.executionId}</code> · revisão {data.source.revision}.</p>
      <p className="benchmark-filename">SHA-256 do original: <code>{data.source.sha256}</code></p>
    </details>
  </section>;
}
