import Link from 'next/link';
import { getReport } from '@/lib/reports';
import type { Report } from '@/lib/types';

type Sources = NonNullable<Report['benchmarkSources']>;
const modes = [{ key: 'agil', label: 'Ágil' }, { key: 'pleno', label: 'Pleno' }];
const score = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const shortDate = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;

function loadRounds(sources: Sources) {
  return sources.map(source => {
    const report = getReport(source.reportId);
    if (!report?.executive) throw new Error(`Missing executive benchmark ${source.reportId}`);
    return { ...source, date: report.date, benchmark: report.executive };
  }).sort((a, b) => a.date.localeCompare(b.date));
}

function modeResults(rounds: ReturnType<typeof loadRounds>, key: string) {
  return rounds.map(round => {
    const result = round.benchmark.modes.find(mode => mode.key === key);
    if (!result) throw new Error(`Missing benchmark mode ${round.reportId}/${key}`);
    return { ...round, result };
  });
}

function MeanChart({ mode, rows }: { mode: string; rows: ReturnType<typeof modeResults> }) {
  const x = (index: number) => 46 + index * 216 / (rows.length - 1);
  const y = (value: number) => 192 - 15.4 * value;
  const description = rows.map(({ label, date, result }) =>
    `${shortDate(date)}, ${label}: VadeChat ${score(result.vcMean)}, adversário ${score(result.opponentMean)}, cobertura ${result.n} de ${result.coverageTotal}.`).join(' ');

  return <figure className="weekly-chart">
    <figcaption><h4>VadeChat {mode}</h4><span>{rows.reduce((n, { result }) => n + result.n, 0)} embates</span></figcaption>
    <svg viewBox="0 0 304 250" role="img" aria-label={`Notas médias no modo ${mode}. Escala de 0 a 10. ${description}`}>
      {[0, 2, 4, 6, 8, 10].map(tick => <g key={tick}>
        <line className="weekly-gridline" x1="34" x2="278" y1={y(tick)} y2={y(tick)}/>
        <text className="weekly-axis" x="26" y={y(tick) + 4} textAnchor="end">{tick}</text>
      </g>)}
      {(['vcMean', 'opponentMean'] as const).map(metric => <polyline key={metric}
        className={`weekly-line ${metric === 'vcMean' ? 'weekly-vc' : 'weekly-opponent'}`}
        points={rows.map(({ result }, i) => `${x(i)},${y(result[metric])}`).join(' ')}/>)}
      {rows.map(({ reportId, date, label, result }, i) => {
        const vcY = y(result.vcMean), opponentY = y(result.opponentMean), at = x(i);
        const vcAbove = vcY <= opponentY;
        const diamond = vcY === opponentY ? 3 : 4.5;
        return <g key={reportId} textAnchor="middle">
          <circle className="weekly-marker weekly-vc" cx={at} cy={vcY} r="5.5"/>
          <path className="weekly-marker weekly-opponent" d={`M ${at} ${opponentY - diamond} l ${diamond} ${diamond} -${diamond} ${diamond} -${diamond} -${diamond} Z`}/>
          <text className="weekly-value weekly-vc" x={at} y={vcY + (vcAbove ? -11 : 21)}>{score(result.vcMean)}</text>
          <text className="weekly-value weekly-opponent" x={at} y={opponentY + (vcAbove ? 21 : -11)}>{score(result.opponentMean)}</text>
          <text className="weekly-category" x={at} y="211">{label.split(' ')[0]}</text>
          <text className="weekly-axis" x={at} y="228">{shortDate(date)}</text>
          <text className={result.n < result.coverageTotal ? 'weekly-coverage' : 'weekly-axis'} x={at} y="244">{result.n}/{result.coverageTotal}</text>
        </g>;
      })}
    </svg>
  </figure>;
}

export default function WeeklyBenchmarkReport({ report, sources }: { report: Report; sources: Sources }) {
  const rounds = loadRounds(sources);
  const results = modes.map(mode => ({ ...mode, rows: modeResults(rounds, mode.key) }));
  return <div className="benchmark weekly-benchmark">
    <div className="meta"><span className="tag">{report.status}</span><span className="tag">{report.count}</span></div>
    <section aria-labelledby="weekly-means">
      <h3 id="weekly-means">Notas médias por rodada</h3>
      <div className="weekly-legend">
        <span><i className="weekly-key weekly-vc" aria-hidden="true"/> VadeChat</span>
        <span><i className="weekly-key weekly-opponent" aria-hidden="true"/> Adversário da rodada</span>
        <span className="weekly-scale">Escala 0–10</span>
      </div>
      <div className="weekly-charts">{results.map(mode => <MeanChart key={mode.key} mode={mode.label} rows={mode.rows}/>)}</div>
      <p className="weekly-reading">As linhas conectam rodadas com adversários e juízes diferentes. A cobertura aparece abaixo de cada data. No Pleno contra Claude, a média usa os 4 embates diretos e o empate derivado da Q04 fica separado.</p>
    </section>
    <details className="executive-detail">
      <summary>Notas, placares e cobertura</summary>
      <div className="benchmark-table-wrap" role="region" tabIndex={0} aria-label="Valores exatos das três rodadas">
        <table className="weekly-values">
          <caption>V / E / D são vitórias, empates e derrotas do VadeChat</caption>
          <thead><tr><th scope="col">Modo</th><th scope="col">Modelo</th><th scope="col">Nota VadeChat</th><th scope="col">Nota adversária</th><th scope="col">V / E / D</th><th scope="col">Cobertura</th></tr></thead>
          <tbody>{results.flatMap(mode => mode.rows.map(({ reportId, label, date, result }) => <tr key={`${mode.key}-${reportId}`}>
            <th scope="row">{mode.label}</th><td>{label}<small>{shortDate(date)}</small></td><td>{score(result.vcMean)}</td><td>{score(result.opponentMean)}</td>
            <td>{result.wins} / {result.ties} / {result.losses}</td><td>{result.n}/{result.coverageTotal}</td>
          </tr>))}</tbody>
        </table>
      </div>
    </details>
    <section className="weekly-sources" aria-labelledby="weekly-sources">
      <h3 id="weekly-sources">Benchmarks completos</h3>
      <ul>{rounds.map(round => <li key={round.reportId}><Link href={`/relatorios/${round.reportId}/`}>
        <span><small>{shortDate(round.date)}</small><strong>{round.label}</strong></span><span aria-hidden="true">↗</span>
      </Link></li>)}</ul>
    </section>
  </div>;
}
