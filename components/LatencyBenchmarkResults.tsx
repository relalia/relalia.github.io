import type { LatencyBenchmark } from '@/lib/types';
import styles from './LatencyBenchmarkResults.module.css';

const formatter = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const seconds = (ms: number) => `${formatter.format(ms / 1000)} s`;

export default function LatencyBenchmarkResults({ data, note }: { data: LatencyBenchmark; note?: string }) {
  const { vadechat, opponent, questions, scaleSeconds } = data;
  const participants = [
    { ...vadechat, key: 'vadechat', timeKey: 'vadechatMs' },
    { ...opponent, key: 'opponent', timeKey: 'opponentMs' },
  ] as const;
  const faster = questions.filter(question => question.opponentMs < question.vadechatMs).length;

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
      <p className={styles.result}>Diferença média de <strong>{seconds(Math.abs(vadechat.meanMs - opponent.meanMs))}</strong>.
        {' '}{opponent.label} terminou primeiro em <strong>{faster} de {questions.length}</strong> perguntas.</p>
    </section>

    <figure className={styles.chart}>
      <figcaption><h3>Tempo por pergunta</h3></figcaption>
      <div className={styles.legend} aria-hidden="true">
        {participants.map(participant => <span key={participant.key} className={styles[participant.key]}>{participant.label}</span>)}
      </div>
      <div className={styles.axis} aria-hidden="true">
        <div>{Array.from({ length: 5 }, (_, i) => <span key={i}>{i * scaleSeconds / 4}{i === 4 ? ' s' : ''}</span>)}</div>
      </div>
      <ul className={styles.questions}>
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
      <p>Do envio pela API até o recebimento do texto completo com confirmação de encerramento. Cada pergunta foi enviada em uma conversa nova por participante, em sequência e sem reenvios. Modelo via OpenRouter <code>{opponent.model}</code>.</p>
      {note && <p>{note}</p>}
    </details>
  </div>;
}
