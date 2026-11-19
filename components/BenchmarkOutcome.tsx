import { retestOutcome, type resultByWins } from '@/lib/benchmark-outcomes.mjs';
import { modeLabel, type Mode } from '@/lib/benchmark';

type Outcome = ReturnType<typeof resultByWins>;
type Props = { result: Outcome; opponent: string };

export function outcomeLabel({ result, opponent }: Props) {
  const labels = {
    vadechat: 'Vitória do VadeChat',
    opponent: `${opponent} venceu`,
    tie: 'Empate',
    none: 'Sem embates comparáveis',
    unknown: 'Placar indisponível',
  };
  return result.partial ? `${labels[result.winner]} · parcial` : labels[result.winner];
}

export function outcomeRecord({ record }: Outcome) {
  return record ? `${record.wins}–${record.ties}–${record.losses}` : 'Indisponível';
}

export function outcomeCoverage({ comparable, coverageTotal }: Outcome) {
  return comparable === null ? 'Indisponível' : `${comparable}/${coverageTotal}`;
}

export function outcomeMean(mean: number | null) {
  return mean === null ? 'Não informada' : mean.toLocaleString('pt-BR', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
}

export function BenchmarkOutcomeTitle({ result, opponent }: Props) {
  return <p className="benchmark-outcome-title">
    <span>Resultado por vitórias</span>
    <strong>{outcomeLabel({ result, opponent })}</strong>
  </p>;
}

export function BenchmarkOutcomeCards({ modes, opponent }: {
  modes: { label: string; result: Outcome }[];
  opponent: string;
}) {
  return <div className="executive-cards">
    {modes.map(({ label, result }) => <article className="executive-card benchmark-outcome-card" key={label} aria-label={`VadeChat ${label}`}>
      <h4>{label}</h4>
      <BenchmarkOutcomeTitle result={result} opponent={opponent}/>
      <dl className="benchmark-outcome-details">
        <div><dt>VadeChat · vitórias–empates–derrotas</dt><dd>{outcomeRecord(result)}</dd></div>
        <div><dt>Média · VadeChat × {opponent}</dt><dd>{outcomeMean(result.vcMean)} × {outcomeMean(result.opponentMean)}</dd></div>
        <div><dt>Embates comparáveis</dt><dd>{outcomeCoverage(result)}</dd></div>
      </dl>
    </article>)}
  </div>;
}

export function BenchmarkRetestOutcomes({ rows, summaries, opponent }: {
  rows: Parameters<typeof retestOutcome>[0];
  summaries: Record<Mode, { denominator: number }>;
  opponent: string;
}) {
  return (['old', 'new'] as const).map((run, index) => <div key={run}>
    <p className="benchmark-outcome-run"><strong>Run 0{index + 1}</strong></p>
    <BenchmarkOutcomeCards opponent={opponent} modes={(['agil', 'pleno'] as const).map(mode => ({
      label: modeLabel(mode),
      result: retestOutcome(rows, mode, run, summaries[mode].denominator),
    }))}/>
  </div>);
}
