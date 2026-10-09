'use client';

import {useState} from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {benchmark, modeLabel, participantLabel, reconstructPrompt, resultLabel} from '@/lib/benchmark';
import type {Mode, Participant, SourceDocument, BenchmarkQuestion} from '@/lib/benchmark';
import {formatScore, statistics} from '@/lib/benchmark-math.mjs';
import Downloads from './Downloads';
import type {Report} from '@/lib/types';

const modes: Mode[] = ['agil','pleno'];
const participants: Participant[] = ['vadechat','chatgpt'];

function TextEvidence({document, label}: {document: SourceDocument; label: string}) {
  const [raw,setRaw] = useState(false);
  const [message,setMessage] = useState('');
  async function copy() {
    try {await navigator.clipboard.writeText(document.text); setMessage('Texto original copiado.');}
    catch {setRaw(true);setMessage('Não foi possível copiar. Selecione o texto original abaixo.');}
  }
  return <details className="benchmark-source">
    <summary>{label}</summary>
    <div className="benchmark-source-body">
      <div className="benchmark-actions">
        <button className="action" onClick={copy}>Copiar texto</button>
        <a className="action" href={document.path} download={document.originalName}>Baixar arquivo de origem</a>
        <button className="action" onClick={()=>setRaw(!raw)} aria-pressed={raw}>{raw?'Ver Markdown':'Ver texto original'}</button>
      </div>
      <p className="note" role="status">{message}</p>
      <p className="benchmark-filename">{document.path}</p>
      {raw ? <pre className="benchmark-raw">{document.text}</pre> : <div className="benchmark-markdown">
        <Markdown remarkPlugins={[remarkGfm]} skipHtml disallowedElements={['img']} components={{
          table:({children})=><div className="benchmark-table-wrap" tabIndex={0} role="region" aria-label={`Tabela em ${label}`}><table>{children}</table></div>,
          h1:({children})=><h5>{children}</h5>, h2:({children})=><h5>{children}</h5>, h3:({children})=><h5>{children}</h5>,
          a:({href,children})=><a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
        }}>{document.text}</Markdown>
      </div>}
      <details className="benchmark-hash"><summary>Integridade SHA-256 · {document.bytes} bytes</summary><code>{document.sha256}</code></details>
    </div>
  </details>;
}

function LineChart({mode}: {mode:Mode}) {
  const [point,setPoint] = useState<{question:BenchmarkQuestion;participant:Participant}|null>(null);
  const x = (i:number)=>50+i*96;
  const y = (score:number)=>225-score*18;
  const tooltipId = `tooltip-${mode}`;
  return <figure className="benchmark-chart">
    <figcaption><strong>{modeLabel(mode)} × ChatGPT gratuito</strong><span>Notas por pergunta</span></figcaption>
    <div className="benchmark-legend"><span className="vc-color">● Vadechat {modeLabel(mode)}</span><span className="gpt-color">◆ ChatGPT gratuito</span></div>
    <svg viewBox="0 0 470 260" role="group" aria-label={`Notas por pergunta: ${modeLabel(mode)} contra ChatGPT gratuito. Escala de zero a dez.`}>
      {[0,2,4,6,8,10].map(score=><g key={score}><line x1="50" x2="434" y1={y(score)} y2={y(score)} stroke="#dfe9e3"/><text x="33" y={y(score)+4} textAnchor="end">{score}</text></g>)}
      {benchmark.questions.map((q,i)=><text x={x(i)} y="251" textAnchor="middle" key={q.id}>{q.id}</text>)}
      {participants.map(participant=><g key={participant} className={participant==='vadechat'?'vc-series':'gpt-series'}>
        <polyline points={benchmark.questions.map((q,i)=>`${x(i)},${y(q.comparisons[mode].scores[participant].total)}`).join(' ')} fill="none" strokeWidth="2.5" strokeDasharray={participant==='chatgpt'?'6 4':undefined}/>
        {benchmark.questions.map((question,i)=>{
          const score = question.comparisons[mode].scores[participant];
          const label = `${question.id}: ${question.question.text}. ${participantLabel(mode,participant)}, nota ${formatScore(score.total)} de 10, ${score.classification}`;
          return <g key={question.id} tabIndex={0} role="button" aria-label={label} aria-describedby={tooltipId}
            onFocus={()=>setPoint({question,participant})} onBlur={()=>setPoint(null)} onMouseEnter={()=>setPoint({question,participant})} onMouseLeave={()=>setPoint(null)}
            onClick={()=>setPoint({question,participant})} onKeyDown={event=>{if(event.key==='Escape')setPoint(null);if(['Enter',' '].includes(event.key)){event.preventDefault();setPoint({question,participant});}}} className="benchmark-point">
            <title>{label}</title><circle cx={x(i)} cy={y(score.total)} r="20" fill="transparent" stroke="none"/>
            {participant==='vadechat'?<circle cx={x(i)} cy={y(score.total)} r="5" strokeWidth="2" fill="white"/>:<path d={`M${x(i)} ${y(score.total)-7} l7 7 -7 7 -7 -7 Z`} strokeWidth="2" fill="white"/>}
          </g>;
        })}
      </g>)}
    </svg>
    <div id={tooltipId} className="benchmark-tooltip" role="status" aria-live="polite">{point ? <><strong>{point.question.id} · {participantLabel(mode,point.participant)} · {formatScore(point.question.comparisons[mode].scores[point.participant].total)}/10 · {point.question.comparisons[mode].scores[point.participant].classification}</strong><p>{point.question.question.text}</p></> : 'Toque, passe o cursor ou use Tab nos marcadores para consultar pergunta, nota e classificação. Os valores também estão nas tabelas e nas evidências.'}</div>
    <details className="benchmark-point-list"><summary>Consultar marcadores por texto</summary><div>{benchmark.questions.flatMap(question=>participants.map(participant=><button className="action" key={`${question.id}-${participant}`} onClick={()=>setPoint({question,participant})} aria-describedby={tooltipId}>{question.id} · {participantLabel(mode,participant)} · {formatScore(question.comparisons[mode].scores[participant].total)}</button>))}</div></details>
  </figure>;
}

function MeanChart({mode}:{mode:Mode}) {
  return <figure className="benchmark-chart benchmark-means">
    <figcaption><strong>Médias · {modeLabel(mode)} × ChatGPT gratuito</strong><span>Conformidade com o gabarito humano · 0 a 10</span></figcaption>
    {participants.map(participant=>{
      const mean=statistics(benchmark.questions,mode,participant).mean;
      return <div className="benchmark-bar-row" key={participant}><div><span>{participantLabel(mode,participant)}</span><strong>{formatScore(mean)}</strong></div><div className="benchmark-bar-track" aria-hidden="true"><div className={participant==='vadechat'?'vc-bar':'gpt-bar'} style={{width:`${(mean??0)*10}%`}}/></div></div>;
    })}
    <p className="note">As médias exatas estão na tabela consolidada.</p>
  </figure>;
}

function QuestionEvidence({q,mode}:{q:BenchmarkQuestion;mode:Mode}) {
  const comparison=q.comparisons[mode];
  return <section className="benchmark-question" id={q.id} aria-labelledby={`${q.id}-title`}>
    <div className="kicker">{q.id} · {modeLabel(mode)} × ChatGPT gratuito</div>
    <h4 id={`${q.id}-title`}>{q.title}</h4><p className="benchmark-question-text">{q.question.text}</p>
    <div className="benchmark-score-grid">{participants.map(participant=><div key={participant}><span>{participantLabel(mode,participant)}</span><strong>{formatScore(comparison.scores[participant].total)}<small>/10</small></strong><span>{comparison.scores[participant].classification} · classificação original</span></div>)}</div>
    <p className="benchmark-result"><strong>{resultLabel(mode,comparison.winner)}</strong> · segundo o julgamento original de Claude</p>
    <p className="note">Alternância verificada: A = {participantLabel(mode,q.order.A as Participant)}; B = {participantLabel(mode,q.order.B as Participant)}. Pontuação e classificação são campos distintos.</p>
    <div className="benchmark-table-wrap" tabIndex={0} role="region" aria-label={`Pontos por critério de ${q.id}`}><table>
      <caption>Pontos por critério · Claude Sonnet 5.5 Médio</caption><thead><tr><th scope="col">Critério</th><th scope="col">Vadechat {modeLabel(mode)}</th><th scope="col">ChatGPT gratuito</th></tr></thead>
      <tbody>{benchmark.criteria.map((criterion,index)=><tr key={criterion.label}><th scope="row">{criterion.label} (0–{criterion.max})</th>{participants.map(p=><td key={p}>{comparison.scores[p].criteria[index]}</td>)}</tr>)}<tr><th scope="row">Total declarado</th>{participants.map(p=><td key={p}>{comparison.scores[p].total}</td>)}</tr><tr><th scope="row">Soma dos critérios</th>{participants.map(p=><td key={p}>{comparison.scores[p].criteriaSum}{comparison.scores[p].criteriaSum!==comparison.scores[p].total && ' · difere do total declarado'}</td>)}</tr></tbody>
    </table></div>
    <aside className="benchmark-review"><strong>Revisão metodológica — GPT 6.1 Sol Alto</strong><p>Resumo editorial da revisão: {comparison.reviewSummary}</p><small>{comparison.reviewKind} A revisão não substitui o julgamento original.</small></aside>
    <TextEvidence key={q.question.path} document={q.question} label="1. Pergunta integral"/>
    <TextEvidence key={q.human.path} document={q.human} label="2. Resposta humana integral · referência"/>
    <TextEvidence key={comparison.response.path} document={comparison.response} label={`3. Resposta integral · Vadechat ${modeLabel(mode)}`}/>
    <TextEvidence key={q.chatgpt.path} document={q.chatgpt} label="4. Resposta integral · ChatGPT gratuito"/>
    <TextEvidence key={comparison.document.path} document={comparison.document} label="5. Julgamento integral · Claude Sonnet 5.5 Médio"/>
    <TextEvidence key={comparison.review.path} document={comparison.review} label="6. Revisão metodológica — GPT 6.1 Sol Alto · integral"/>
  </section>;
}

function Protocol() {
  const [qid,setQid]=useState('Q01');
  const [mode,setMode]=useState<Mode>('agil');
  const [message,setMessage]=useState('');
  const q=benchmark.questions.find(item=>item.id===qid)!;
  const reconstructed = reconstructPrompt(q,mode);
  return <section id="benchmark-protocol" className="benchmark-section">
    <div className="section-head"><h3>Protocolo e limites da execução</h3><p>Procedimentos documentados; configurações ausentes permanecem não registradas.</p></div>
    <p>O protocolo determina uso exclusivo da pergunta, referência humana e respostas A/B; avaliação de significado; separação entre omissões, contradições e informações não verificáveis; e proíbe favorecer extensão, citações ou pesquisar legislação. A ordem A/B alterna por questão e vale para os dois modos.</p>
    <ul>{benchmark.criteria.map(c=><li key={c.label}>{c.label}: 0 a {c.max} pontos ({c.max*10}% da escala total).</li>)}</ul>
    <p>Conforme requer nota ≥ 8 sem contradição essencial. Parcialmente conforme, Divergente, Abstenção e Inconclusiva seguem as definições do protocolo integral. O vencedor usa a maior nota; notas iguais resultam em empate.</p>
    <p>{benchmark.metadata.source} Juiz: {benchmark.metadata.judge}. Revisor: {benchmark.metadata.reviewer}. {benchmark.metadata.reviewerRole} Participante ChatGPT: modalidade gratuita; {benchmark.metadata.chatgptModel}. A modalidade de acesso não identifica modelo interno, roteamento, nível de raciocínio ou ferramentas.</p>
    <p>{benchmark.metadata.missing}</p>
    <ul className="benchmark-limitations">{benchmark.limitations.map(text=><li key={text}>{text}</li>)}</ul>
    <p className="note">Metadados compatíveis com os arquivos: a alternância identifica Claude Sonnet 5.5 Médio; as revisões usam a grafia histórica “GPT-6.1 Sol Alta”. A modalidade gratuita do ChatGPT e o acesso pago do revisor foram informados pelo executor. Não foi identificada indicação conflitante de modelo do participante nos arquivos.</p>
    <TextEvidence document={benchmark.protocol} label="global_prompt.txt · protocolo integral"/>
    <TextEvidence document={benchmark.alternation} label="answer_alternation.txt · correspondência A/B integral"/>
    <details className="benchmark-source"><summary>Prompt reconstruído a partir dos arquivos</summary><div className="benchmark-source-body">
      <p>Composição do modelo de protocolo com pergunta, referência e respostas na ordem A/B documentada. Não é registro do prompt completo efetivamente enviado.</p>
      <div className="benchmark-actions"><label>Pergunta<select value={qid} onChange={e=>{setQid(e.target.value);setMessage('');}}>{benchmark.questions.map(q=><option key={q.id}>{q.id}</option>)}</select></label><label>Modo<select value={mode} onChange={e=>{setMode(e.target.value as Mode);setMessage('');}}>{modes.map(m=><option key={m} value={m}>{modeLabel(m)}</option>)}</select></label><button className="action" onClick={async()=>{try{await navigator.clipboard.writeText(reconstructed);setMessage('Prompt reconstruído copiado.');}catch{setMessage('Selecione o texto abaixo para copiar.');}}}>Copiar composição</button></div>
      <p role="status">{message}</p><pre className="benchmark-raw">{reconstructed}</pre>
    </div></details>
  </section>;
}

export default function BenchmarkReport({report}:{report:Report}) {
  const [mode,setMode]=useState<Mode>('agil');
  return <div className="benchmark">
    <p className="benchmark-subtitle">{benchmark.subtitle}</p>
    <div className="meta"><span className="tag">5 perguntas técnicas</span><span className="tag">10 julgamentos comparativos</span><span className="tag">Escala de 0 a 10</span></div>
    <p className="benchmark-caveat">{benchmark.caveat}</p>
    <nav className="benchmark-nav" aria-label="Seções do benchmark"><a href="#benchmark-results">Resultados</a><a href="#benchmark-charts">Gráficos</a><a href="#benchmark-evidence">Evidências integrais</a><a href="#benchmark-protocol">Protocolo</a></nav>
    <section id="benchmark-results" className="benchmark-section">
      <div className="section-head"><h3>O que esta amostra mostrou</h3><p>Síntese editorial dos julgamentos originais · conformidade com o gabarito humano</p></div>
      <p>O Ágil obteve maior cobertura que o ChatGPT gratuito em Q05, empatou em Q03 e perdeu em Q01, Q02 e Q04. O Pleno venceu em Q04 e Q05, empatou em Q01 e Q03 e perdeu em Q02. Segundo o juiz, o Pleno cobriu o limite fiscal de Q04 e mais requisitos da ficha de firma em Q05; ainda omitiu situações de especial atenção em Q02. As revisões questionam classificações e descontos em parte dos julgamentos.</p>
      <div className="benchmark-toggle" role="group" aria-label="Selecionar embate">{modes.map(m=><button key={m} aria-pressed={mode===m} className={`action ${mode===m?'primary':''}`} onClick={()=>setMode(m)}>{modeLabel(m)} × ChatGPT gratuito</button>)}</div>
      <div className="benchmark-score-grid" aria-live="polite">{participants.map(participant=>{
        const s=statistics(benchmark.questions,mode,participant);
        return <div className={`benchmark-stat ${participant==='vadechat'?'vc-stat':'gpt-stat'}`} key={participant}><span>{participantLabel(mode,participant)}</span><strong>{formatScore(s.mean)}<small>/10 · média</small></strong><span>{s.wins} vitórias · {s.ties} empates · {s.losses} derrotas</span></div>;
      })}</div>
      <p className="note">Resultados do juiz preservados. Vencer em pontos não implica classificação Conforme. A execução não mede preço, custo-benefício ou economia de tempo.</p>
      <div className="benchmark-roles"><div><strong>Referência</strong><p>{benchmark.metadata.reference}</p></div><div><strong>Participantes</strong><p>Vadechat Ágil · Vadechat Pleno · ChatGPT gratuito ({benchmark.metadata.chatgptModel})</p></div><div><strong>Juiz</strong><p>{benchmark.metadata.judge}</p></div><div><strong>Revisor dos julgamentos</strong><p>{benchmark.metadata.reviewer}</p></div></div>
      <p className="note">{benchmark.metadata.source} {benchmark.metadata.reviewerRole} A revisão de outra IA também não constitui validação jurídica independente.</p>
    </section>
    <section id="benchmark-charts" className="benchmark-section">
      <div className="section-head"><h3>Notas por pergunta</h3><p>Mesma escala nos dois embates. Segmentos retos ligam o perfil por questão; não representam evolução temporal.</p></div>
      <div className="benchmark-charts">{modes.map(m=><LineChart key={m} mode={m}/>)}</div>
      <div className="benchmark-charts">{modes.map(m=><MeanChart key={m} mode={m}/>)}</div>
      <div className="benchmark-table-wrap" tabIndex={0} role="region" aria-label="Tabela consolidada de notas com rolagem horizontal"><table className="benchmark-consolidated"><caption>Valores exatos · totais declarados pelo Claude</caption><thead><tr><th scope="col">Questão</th><th scope="col">Ágil</th><th scope="col">ChatGPT gratuito contra Ágil</th><th scope="col">Pleno</th><th scope="col">ChatGPT gratuito contra Pleno</th></tr></thead><tbody>{benchmark.questions.map(q=><tr key={q.id}><th scope="row"><a href={`#${q.id}`}>{q.id}</a></th>{modes.flatMap(m=>participants.map(p=><td key={`${m}-${p}`}>{formatScore(q.comparisons[m].scores[p].total)}</td>))}</tr>)}</tbody><tfoot><tr><th scope="row">Média</th>{modes.flatMap(m=>participants.map(p=><td key={`${m}-${p}`}>{formatScore(statistics(benchmark.questions,m,p).mean)}</td>))}</tr></tfoot></table></div>
      <h4>Mesmas respostas, julgamentos diferentes</h4><p>Variação observada no julgamento do ChatGPT gratuito. Os textos avaliados são os mesmos em ambos os embates; a causa dessa variação não foi isolada.</p>
      <div className="benchmark-table-wrap" tabIndex={0} role="region" aria-label="Variação das notas e classificações do ChatGPT gratuito"><table><caption>ChatGPT gratuito · diferenças lado a lado</caption><thead><tr><th scope="col">Questão</th><th scope="col">Contra Ágil</th><th scope="col">Contra Pleno</th><th scope="col">Diferença (Pleno − Ágil)</th></tr></thead><tbody>{benchmark.questions.map(q=>{
        const a=q.comparisons.agil.scores.chatgpt,b=q.comparisons.pleno.scores.chatgpt,d=b.total-a.total;
        return <tr key={q.id}><th scope="row">{q.id}</th><td><strong>{formatScore(a.total)}</strong><small>{a.classification}</small></td><td><strong>{formatScore(b.total)}</strong><small>{b.classification}</small></td><td>{d>0?'+':''}{formatScore(d)} ponto(s)</td></tr>;
      })}</tbody></table></div>
    </section>
    <section id="benchmark-evidence" className="benchmark-section">
      <div className="section-head"><h3>Audite cada comparação</h3><p>Textos integrais preservados. Resumos editoriais identificados; julgamento e revisão têm autoria separada.</p></div>
      <div className="benchmark-toggle" role="group" aria-label="Selecionar embate das evidências">{modes.map(m=><button key={m} className={`action ${mode===m?'primary':''}`} aria-pressed={mode===m} onClick={()=>setMode(m)}>{modeLabel(m)} × ChatGPT gratuito</button>)}</div>
      <nav className="benchmark-nav" aria-label="Perguntas">{benchmark.questions.map(q=><a href={`#${q.id}`} key={q.id}>{q.id}</a>)}</nav>
      {benchmark.questions.map(q=><QuestionEvidence key={q.id} q={q} mode={mode}/>)}
    </section>
    <Protocol/>
    <Downloads files={report.files}/>
  </div>;
}
