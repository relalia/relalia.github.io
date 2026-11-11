import type { LatencyBenchmark } from '@/lib/types';
import styles from './LatencyBenchmarkResults.module.css';

const formatter = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const seconds = (ms: number) => `${formatter.format(ms / 1000)} s`;
const multiplier = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const percentage = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 2 });

export default function LatencyBenchmarkResults({ data, note }: { data: LatencyBenchmark; note?: string }) {
  const { vadechat, opponent, questions, scaleSeconds } = data;
  const participants = [
    { ...vadechat, key: 'vadechat', timeKey: 'vadechatMs' },
    { ...opponent, key: 'opponent', timeKey: 'opponentMs' },
  ] as const;
  const [faster, slower] = vadechat.meanMs <= opponent.meanMs ? participants : [participants[1], participants[0]];
  const difference = slower.meanMs - faster.meanMs;
  const first = questions.filter(question => question[faster.timeKey] < question[slower.timeKey]).length;
  const methodology = <>
    <p>Do envio pela API até o recebimento do texto completo com confirmação de encerramento. Cada pergunta foi enviada em uma conversa nova por participante, em sequência e sem reenvios. Modelo via OpenRouter <code>{opponent.model}</code>.</p>
    {note && <p>{note}</p>}
  </>;

  return <div className={styles.results}>
    <section aria-labelledby="latency-average">
      <h3 id="latency-average">Tempo médio até a resposta completa</h3>
      <div className={styles.metrics}>
        {participants.map(participant => <div key={participant.key} className={`${styles.metric} ${styles[participant.key]}`}>
          <span>{participant.label}</span>
          <strong>{seconds(participant.meanMs)}</strong>
          <small>{seconds(participant.totalMs)} no total</small>
        </div>)}
      </div>
      {difference > 0 && <div className={`${styles.advantage} ${styles[faster.key]}`}>
        <h4>{faster.label} teve o menor tempo médio</h4>
        <div className={styles.advantageMetrics}>
          {faster.meanMs > 0 && <div><strong>{multiplier.format(slower.meanMs / faster.meanMs)}×</strong>
            <span>Tempo do {slower.label} ÷ tempo do {faster.label}</span></div>}
          <div><strong>{percentage.format(difference / slower.meanMs)}</strong><span>Menos tempo que {slower.label}</span></div>
          <div className={styles.firstShare}><strong>{percentage.format(first / questions.length)}</strong>
            <span>Terminou primeiro em {first} de {questions.length} perguntas</span></div>
        </div>
      </div>}
      <p className={styles.result}>Diferença média de <strong>{seconds(difference)}</strong> por pergunta.</p>
    </section>

    <figure className={styles.chart}>
      <figcaption><h3>Tempo por pergunta</h3></figcaption>
      <div className={styles.legend} aria-hidden="true">
        {participants.map(participant => <span key={participant.key} className={styles[participant.key]}>{participant.label}</span>)}
      </div>
      <div className={styles.axis} aria-hidden="true">
        <div>{Array.from({ length: 5 }, (_, i) => <span key={i}>{i * scaleSeconds / 4}{i === 4 ? ' s' : ''}</span>)}</div>
      </div>
      <ul className={styles.questions} role="list">
        {questions.map(question => <li key={question.label}>
          <h4>{question.label}</h4>
          {participants.map(participant => <div key={participant.key} className={`${styles.barRow} ${styles[participant.key]}`}>
            <span className={styles.srOnly}>{participant.label}</span>
            <div className={styles.track} aria-hidden="true"><span style={{ width: `${100 * question[participant.timeKey] / (scaleSeconds * 1000)}%` }}/></div>
            <strong>{seconds(question[participant.timeKey])}</strong>
          </div>)}
        </li>)}
      </ul>
    </figure>

    <details className={styles.method}>
      <summary>Como foi medido</summary>
      {methodology}
    </details>
    <section className={`${styles.method} ${styles.printMethod}`}><strong>Como foi medido</strong>{methodology}</section>
  </div>;
}
