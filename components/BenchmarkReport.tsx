'use client';

import {createContext, useContext, useState} from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {getBenchmark, modeLabel, participantLabel as labelParticipant, reconstructPrompt, resultLabel as labelResult} from '@/lib/benchmark';
import type {Mode, Participant, SourceDocument, BenchmarkQuestion, Benchmark} from '@/lib/benchmark';
import {formatScore, statistics, classificationCounts, outcomeCounts} from '@/lib/benchmark-math.mjs';
import Downloads from './Downloads';
import SelectFilter from './SelectFilter';
import type {Report} from '@/lib/types';

const modes: Mode[] = ['agil','pleno'];
const participants: Participant[] = ['vadechat','alternative'];
const BenchmarkContext=createContext<Benchmark|null>(null);
function useBenchmark() {
  const benchmark=useContext(BenchmarkContext);
  if(!benchmark)throw Error('Missing benchmark context');
  return {benchmark, participantLabel:(mode:Mode,p:Participant)=>labelParticipant(mode,p,benchmark),resultLabel:(mode:Mode,winner:string)=>labelResult(mode,winner,benchmark)};
}


export function TextEvidence({document, label}: {document: SourceDocument; label: string}) {
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
  const {benchmark,participantLabel,resultLabel}=useBenchmark();
  const [point,setPoint] = useState<{question:BenchmarkQuestion;participant:Participant}|null>(null);
  const x = (i:number)=>50+i*96;
  const y = (score:number)=>225-score*18;
  const tooltipId = `tooltip-${mode}`;
  return <figure className="benchmark-chart">
    <figcaption><strong>{modeLabel(mode)} × {benchmark.alternativeLabel}</strong><span>Notas por pergunta</span></figcaption>
    <div className="benchmark-legend"><span className="vc-color">● Vadechat {modeLabel(mode)}</span><span className="gpt-color">◆ {benchmark.alternativeLabel}</span></div>
    <svg viewBox="0 0 470 260" role="group" aria-label={`Notas por pergunta: ${modeLabel(mode)} contra ${benchmark.alternativeLabel}. Escala de zero a dez.`}>
      {[0,2,4,6,8,10].map(score=><g key={score}><line x1="50" x2="434" y1={y(score)} y2={y(score)} stroke="#dfe9e3"/><text x="33" y={y(score)+4} textAnchor="end">{score}</text></g>)}
      {benchmark.questions.map((q,i)=><text x={x(i)} y="251" textAnchor="middle" key={q.id}>{q.id}</text>)}
      {participants.map(participant=><g key={participant} className={participant==='vadechat'?'vc-series':'gpt-series'}>
        <polyline points={benchmark.questions.map((q,i)=>`${x(i)},${y(q.comparisons[mode].scores[participant].total)}`).join(' ')} fill="none" strokeWidth="2.5" strokeDasharray={participant==='alternative'?'6 4':undefined}/>
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
  const {benchmark,participantLabel,resultLabel}=useBenchmark();
  return <figure className="benchmark-chart benchmark-means">
    <figcaption><strong>Médias · {modeLabel(mode)} × {benchmark.alternativeLabel}</strong><span>Conformidade com o gabarito humano · 0 a 10</span></figcaption>
    {participants.map(participant=>{
      const mean=statistics(benchmark.questions,mode,participant).mean;
      return <div className="benchmark-bar-row" key={participant}><div><span>{participantLabel(mode,participant)}</span><strong>{formatScore(mean)}</strong></div><div className="benchmark-bar-track" aria-hidden="true"><div className={participant==='vadechat'?'vc-bar':'gpt-bar'} style={{width:`${(mean??0)*10}%`}}/></div></div>;
    })}
    <p className="note">As médias exatas estão na tabela consolidada.</p>
  </figure>;
}

function QuestionEvidence({q,mode}:{q:BenchmarkQuestion;mode:Mode}) {
  const {benchmark,participantLabel,resultLabel}=useBenchmark();
  const comparison=q.comparisons[mode];
  return <section className="benchmark-question" id={q.id} aria-labelledby={`${q.id}-title`}>
    <div className="kicker">{q.id} · {modeLabel(mode)} × {benchmark.alternativeLabel}</div>
    <h4 id={`${q.id}-title`}>{q.title}</h4><p className="benchmark-question-text">{q.question.text}</p>
    <div className="benchmark-score-grid">{participants.map(participant=><div key={participant}><span>{participantLabel(mode,participant)}</span><strong>{formatScore(comparison.scores[participant].total)}<small>/10</small></strong><span>{comparison.scores[participant].classification} · classificação original</span></div>)}</div>
    <p className="benchmark-result"><strong>{resultLabel(mode,comparison.winner)}</strong> · segundo o julgamento original de {benchmark.judgeLabel}</p>
    <p className="note">Diferença Vadechat − {benchmark.alternativeLabel}: {formatScore(comparison.scores.vadechat.total-comparison.scores.alternative.total)} ponto(s). {comparison.tieKind==='abstention'?'Empate por abstenção.':comparison.tieKind==='ordinary'?'Empate comum.':''}</p>
    {comparison.observations.map(text=><p className="benchmark-caveat" key={text}>{text}</p>)}
    <p className="note">Alternância verificada: A = {participantLabel(mode,comparison.order.A as Participant)}; B = {participantLabel(mode,comparison.order.B as Participant)}. Pontuação e classificação são campos distintos.</p>
    <div className="benchmark-table-wrap" tabIndex={0} role="region" aria-label={`Pontos por critério de ${q.id}`}><table>
      <caption>Pontos por critério · {benchmark.judgeLabel}</caption><thead><tr><th scope="col">Critério</th><th scope="col">Vadechat {modeLabel(mode)}</th><th scope="col">{benchmark.alternativeLabel}</th></tr></thead>
      <tbody>{benchmark.criteria.map((criterion,index)=><tr key={criterion.label}><th scope="row">{criterion.label} (0–{criterion.max})</th>{participants.map(p=><td key={p}>{formatScore(comparison.scores[p].criteria[index])}</td>)}</tr>)}<tr><th scope="row">Total declarado</th>{participants.map(p=><td key={p}>{formatScore(comparison.scores[p].total)}</td>)}</tr><tr><th scope="row">Soma dos critérios</th>{participants.map(p=><td key={p}>{formatScore(comparison.scores[p].criteriaSum)}{comparison.scores[p].criteriaSum!==comparison.scores[p].total && ' · difere do total declarado'}</td>)}</tr></tbody>
    </table></div>
    <aside className="benchmark-review"><strong>{benchmark.reviewerTitle}</strong>{comparison.reviewProblem ? <><p><b>Problema identificado pela revisão:</b> {comparison.reviewProblem}</p><p><b>Impacto possível na interpretação:</b> {comparison.reviewImpact}</p><p><b>Necessidade de revisão:</b> {comparison.reviewAction}</p></> : <p>Resumo editorial da revisão: {comparison.reviewSummary}</p>}<small>{comparison.reviewKind} A revisão não substitui o julgamento original.</small></aside>
    <TextEvidence key={q.question.path} document={q.question} label="1. Pergunta integral"/>
    <TextEvidence key={q.human.path} document={q.human} label="2. Resposta humana integral · referência"/>
    <TextEvidence key={comparison.response.path} document={comparison.response} label={`3. Resposta integral · Vadechat ${modeLabel(mode)}`}/>
    <TextEvidence key={q.alternative.path} document={q.alternative} label={`4. Resposta integral · ${benchmark.alternativeLabel}`}/>
    <TextEvidence key={comparison.document.path} document={comparison.document} label={`5. Julgamento integral · ${benchmark.judgeLabel}`}/>
    <TextEvidence key={comparison.review.path} document={comparison.review} label={`6. ${benchmark.reviewerTitle} · integral`}/>
    {benchmark.conditions.length>0 && <>
      <details className="benchmark-reference"><summary>Referência substantiva, fatos obrigatórios e metadados administrativos</summary><p>Fonte: <a href={q.human.path} download>{q.human.originalName}</a>. Os metadados permanecem separados da pergunta e do corpo substantivo da referência.</p><pre className="benchmark-raw">{q.referenceText}</pre><h5>Fatos obrigatórios e pesos registrados</h5>{q.mandatoryFacts.length?q.mandatoryFacts.map(f=><p key={f.text}>{f.text} · peso {f.weight.toFixed(2)}</p>):<p>Nenhum fato obrigatório com peso explicitamente registrado.</p>}<h5>Metadados administrativos integrais</h5><pre className="benchmark-raw">{q.administrativeText||'Não registrado'}</pre></details>
      <ReconstructedPrompt q={q} mode={mode}/>
    </>}
  </section>;
}

function ReconstructedPrompt({q,mode}:{q:BenchmarkQuestion;mode:Mode}) {
  const {benchmark}=useBenchmark();
  const [message,setMessage]=useState('');
  const text=reconstructPrompt(q,mode,benchmark);
  function download() {const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const anchor=document.createElement('a');anchor.href=url;anchor.download=`${benchmark.id}-${q.id}-${mode}-prompt-reconstruido.txt`;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  return <details className="benchmark-source"><summary>7. Prompt reconstruído · {q.id} · {modeLabel(mode)}</summary><div className="benchmark-source-body"><p>Composição editorial, não registro do envio efetivo. Fontes: {[[benchmark.protocol,'protocolo'],[q.question,'pergunta'],[q.human,'referência, fatos/pesos e observação de revisão'],[q.alternative,'alternativa'],[q.comparisons[mode].response,'Vadechat'],[benchmark.alternation,'ordem A/B']].map(([doc,label])=>{const source=doc as SourceDocument;return <a key={source.path} href={source.path} download>{label as string} · </a>;})}</p><p>Variações da pergunta não compõem o enunciado. Fatos/pesos e observações são identificados separadamente. A inclusão efetiva desses componentes no prompt enviado não foi registrada.</p><div className="benchmark-actions"><button className="action" onClick={async()=>{try{await navigator.clipboard.writeText(text);setMessage('Prompt reconstruído copiado.');}catch{setMessage('Selecione o texto abaixo.');}}}>Copiar prompt reconstruído</button><button className="action" onClick={download}>Baixar composição reconstruída</button></div><p role="status">{message}</p><pre className="benchmark-raw">{text}</pre></div></details>;
}

function EvidenceIndex() {
  const {benchmark}=useBenchmark();
  const documents=[benchmark.protocol,benchmark.alternation,...benchmark.questions.flatMap(q=>[q.question,q.human,q.alternative,...modes.flatMap(m=>[q.comparisons[m].response,q.comparisons[m].document,q.comparisons[m].review])])];
  return <details className="benchmark-source" id="benchmark-index"><summary>Índice das {documents.length} evidências originais · downloads</summary><div className="benchmark-source-body"><p>Arquivos preservados byte a byte. O manifesto de integridade contém o SHA-256 de cada original.</p><ul className="benchmark-evidence-index">{documents.map(doc=><li key={doc.path}><a href={doc.path} download={doc.originalName}>{doc.path.replace(`/originals/benchmark/${benchmark.id}/`,'')}</a><small>{doc.bytes} bytes · SHA-256: {doc.sha256}</small></li>)}</ul></div></details>;
}

function DetailedResults({mode}:{mode:Mode}) {
  const {benchmark,participantLabel,resultLabel}=useBenchmark();
  const outcomes=outcomeCounts(benchmark.questions,mode);
  return <>
    <p className="note">Denominadores: média = cinco notas por participante neste embate; vitórias/derrotas = cinco comparações; classificações = cinco respostas avaliadas por série. {outcomes.ordinaryTies} empates comuns; {outcomes.abstentionTies} por abstenção; {outcomes.inconclusive} resultados inconclusivos. Ausência de nota não é zero.</p>
    <div className="benchmark-table-wrap" tabIndex={0} role="region" aria-label="Notas, classificações e diferenças do embate"><table><caption>Resultado original · {modeLabel(mode)} × {benchmark.alternativeLabel}</caption><thead><tr><th scope="col">Questão</th><th scope="col">Vadechat {modeLabel(mode)}</th><th scope="col">{benchmark.alternativeLabel}</th><th scope="col">Diferença VC − alternativa</th><th scope="col">Resultado</th></tr></thead><tbody>{benchmark.questions.map(q=>{const c=q.comparisons[mode];return <tr key={q.id}><th scope="row">{q.id}</th>{participants.map(p=><td key={p}>{formatScore(c.scores[p].total)}<small>{c.scores[p].classification}</small></td>)}<td>{formatScore(c.scores.vadechat.total-c.scores.alternative.total)}</td><td>{resultLabel(mode,c.winner)}</td></tr>;})}</tbody></table></div>
    <div className="benchmark-table-wrap" tabIndex={0} role="region" aria-label="Distribuição das classificações originais"><table><caption>Distribuição de classificações · cinco avaliações em cada série</caption><thead><tr><th scope="col">Participante</th>{Object.keys(classificationCounts(benchmark.questions,mode,'vadechat')).map(label=><th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{participants.map(p=><tr key={p}><th scope="row">{participantLabel(mode,p)}</th>{Object.values(classificationCounts(benchmark.questions,mode,p)).map((n,i)=><td key={i}>{n}/5</td>)}</tr>)}</tbody></table></div>
  </>;
}

function Protocol() {
  const {benchmark,participantLabel,resultLabel}=useBenchmark();
  const [qid,setQid]=useState('Q01');
  const [mode,setMode]=useState<Mode>('agil');
  const [message,setMessage]=useState('');
  const q=benchmark.questions.find(item=>item.id===qid)!;
  const reconstructed = reconstructPrompt(q,mode,benchmark);
  return <section id="benchmark-protocol" className="benchmark-section">
    <div className="section-head"><h3>Protocolo e limites da execução</h3><p>Procedimentos documentados; configurações ausentes permanecem não registradas.</p></div>
    <p>O protocolo determina uso exclusivo da pergunta, referência humana e respostas A/B; avaliação de significado; separação entre omissões, contradições e informações não verificáveis; e proíbe favorecer extensão, citações ou pesquisar legislação. A ordem A/B alterna por questão e vale para os dois modos.</p>
    <ul>{benchmark.criteria.map(c=><li key={c.label}>{c.label}: 0 a {c.max} pontos ({c.max*10}% da escala total).</li>)}</ul>
    <p>Conforme requer nota ≥ 8 sem contradição essencial. Parcialmente conforme, Divergente, Abstenção e Inconclusiva seguem as definições do protocolo integral. O vencedor usa a maior nota; notas iguais resultam em empate.</p>
    <p>{benchmark.metadata.source} Juiz: {benchmark.metadata.judge}. Revisor: {benchmark.metadata.reviewer}. {benchmark.metadata.reviewerRole} Participante {benchmark.alternativeLabel}: {benchmark.metadata.alternativeModel}. A modalidade de acesso não identifica modelo interno, roteamento, nível de raciocínio ou ferramentas.</p>
    <p>{benchmark.metadata.missing}</p>
    <ul className="benchmark-limitations">{benchmark.limitations.map(text=><li key={text}>{text}</li>)}</ul>
    <p className="note">{benchmark.protocolMetadataNote}</p>
    <TextEvidence document={benchmark.protocol} label="global_prompt.txt · protocolo integral"/>
    <TextEvidence document={benchmark.alternation} label="answer_alternation.txt · correspondência A/B integral"/>
    <details className="benchmark-source"><summary>Prompt reconstruído a partir dos arquivos</summary><div className="benchmark-source-body">
      <p>Composição do modelo de protocolo com pergunta, referência e respostas na ordem A/B documentada. Não é registro do prompt completo efetivamente enviado. Os arquivos de cada componente estão disponíveis junto da respectiva comparação.</p>
      <div className="benchmark-actions"><label>Pergunta<select value={qid} onChange={e=>{setQid(e.target.value);setMessage('');}}>{benchmark.questions.map(q=><option key={q.id}>{q.id}</option>)}</select></label><label>Modo<select value={mode} onChange={e=>{setMode(e.target.value as Mode);setMessage('');}}>{modes.map(m=><option key={m} value={m}>{modeLabel(m)}</option>)}</select></label><button className="action" onClick={async()=>{try{await navigator.clipboard.writeText(reconstructed);setMessage('Prompt reconstruído copiado.');}catch{setMessage('Selecione o texto abaixo para copiar.');}}}>Copiar composição</button></div>
      <p role="status">{message}</p><pre className="benchmark-raw">{reconstructed}</pre>
    </div></details>
  </section>;
}

function BenchmarkBody({report}:{report:Report}) {
  const {benchmark,participantLabel,resultLabel}=useBenchmark();
  const [questionFilter,setQuestionFilter]=useState('all');
  const [mode,setMode]=useState<Mode>('agil');
  return <div className="benchmark">
    <p className="benchmark-subtitle">{benchmark.subtitle}</p>
    <div className="meta"><span className="tag">5 perguntas técnicas</span><span className="tag">10 julgamentos comparativos</span><span className="tag">Escala de 0 a 10</span></div>
    <p className="benchmark-caveat">{benchmark.caveat}</p>
    {benchmark.conditions.length>0 && <p className="note">Execução: {benchmark.executionDate.split('-').reverse().join('/')} · publicação: {benchmark.publicationDate.split('-').reverse().join('/')}. Data de execução confirmada pelo executor.</p>}
    <nav className="benchmark-nav" aria-label="Seções do benchmark"><a href="#benchmark-results">Resultados</a><a href="#benchmark-charts">Gráficos</a><a href="#benchmark-evidence">Evidências integrais</a><a href="#benchmark-protocol">Protocolo</a></nav>
    <section id="benchmark-results" className="benchmark-section">
      <div className="section-head"><h3>O que esta amostra mostrou</h3><p>Síntese editorial dos julgamentos originais · conformidade com o gabarito humano</p></div>
      {!benchmark.conditions.length && <p>{benchmark.summary}</p>}
      <div className="benchmark-toggle" role="group" aria-label="Selecionar embate">{modes.map(m=><button key={m} aria-pressed={mode===m} className={`action ${mode===m?'primary':''}`} onClick={()=>setMode(m)}>{modeLabel(m)} × {benchmark.alternativeLabel}</button>)}</div>
      <div className="benchmark-score-grid" aria-live="polite">{participants.map(participant=>{
        const s=statistics(benchmark.questions,mode,participant);
        return <div className={`benchmark-stat ${participant==='vadechat'?'vc-stat':'gpt-stat'}`} key={participant}><span>{participantLabel(mode,participant)}</span><strong>{formatScore(s.mean)}<small>/10 · média</small></strong><span>{s.wins} {s.wins===1?'vitória':'vitórias'} · {s.ties} {s.ties===1?'empate':'empates'} · {s.losses} {s.losses===1?'derrota':'derrotas'}</span></div>;
      })}</div>
      {benchmark.conditions.length>0 && <><p>{benchmark.summary}</p><aside className="benchmark-review"><strong>Ressalvas que afetam a interpretação dos resultados</strong><p>As notas são as originais do ChatGPT Grátis. GPT-6.1 Alta aponta erros de leitura e possível desconto ou crédito indevido, e pede revisão de notas e vencedores em Q05. Q04 Pleno também tem omissões adicionais não registradas pelo juiz. Consulte a auditoria junto de cada resultado.</p></aside></>}
      <p className="note">Resultados do juiz preservados. Vencer em pontos não implica classificação Conforme. A execução não mede preço, custo-benefício ou economia de tempo.</p>
      {benchmark.conditions.length>0 && <DetailedResults mode={mode}/>}
      <div className="benchmark-roles"><div><strong>Referência</strong><p>{benchmark.metadata.reference}</p></div><div><strong>Participantes</strong><p>{benchmark.metadata.participants.join(' · ')} ({benchmark.metadata.alternativeModel})</p></div><div><strong>Juiz</strong><p>{benchmark.metadata.judge}</p></div><div><strong>Revisor dos julgamentos</strong><p>{benchmark.metadata.reviewer}</p></div></div>
      <p className="note">{benchmark.metadata.source} {benchmark.metadata.reviewerRole} A revisão de outra IA também não constitui validação jurídica independente.</p>
      {benchmark.conditions.length>0 && <details className="benchmark-conditions"><summary>Condições observadas nas duas execuções</summary>{benchmark.conditions.map(text=><p key={text}>{text}</p>)}<a href="/relatorios/benchmark-2026-10-09/">Consultar benchmark anterior VC × ChatGPT</a></details>}
    </section>
    <section id="benchmark-charts" className="benchmark-section">
      <div className="section-head"><h3>Notas por pergunta</h3><p>Mesma escala nos dois embates. Segmentos retos ligam o perfil por questão; não representam evolução temporal.</p></div>
      <div className="benchmark-charts">{modes.map(m=><LineChart key={m} mode={m}/>)}</div>
      <div className="benchmark-charts">{modes.map(m=><MeanChart key={m} mode={m}/>)}</div>
      <div className="benchmark-table-wrap" tabIndex={0} role="region" aria-label="Tabela consolidada de notas com rolagem horizontal"><table className="benchmark-consolidated"><caption>Valores exatos · totais declarados por {benchmark.judgeLabel}</caption><thead><tr><th scope="col">Questão</th><th scope="col">Ágil</th><th scope="col">{benchmark.alternativeLabel} contra Ágil</th><th scope="col">Pleno</th><th scope="col">{benchmark.alternativeLabel} contra Pleno</th></tr></thead><tbody>{benchmark.questions.map(q=><tr key={q.id}><th scope="row"><a href={`#${q.id}`}>{q.id}</a></th>{modes.flatMap(m=>participants.map(p=><td key={`${m}-${p}`}>{formatScore(q.comparisons[m].scores[p].total)}</td>))}</tr>)}</tbody><tfoot><tr><th scope="row">Média</th>{modes.flatMap(m=>participants.map(p=><td key={`${m}-${p}`}>{formatScore(statistics(benchmark.questions,m,p).mean)}</td>))}</tr></tfoot></table></div>
      <h4>Mesmas respostas, julgamentos diferentes</h4><p>{benchmark.varianceDescription}</p><p className="note">{benchmark.reuseNote}</p>
      <div className="benchmark-table-wrap" tabIndex={0} role="region" aria-label={`Variação das notas e classificações de ${benchmark.alternativeLabel}`}><table><caption>{benchmark.alternativeLabel} · diferenças lado a lado</caption><thead><tr><th scope="col">Questão</th><th scope="col">Contra Ágil</th><th scope="col">Contra Pleno</th><th scope="col">Diferença (Pleno − Ágil)</th></tr></thead><tbody>{benchmark.questions.map(q=>{
        const a=q.comparisons.agil.scores.alternative,b=q.comparisons.pleno.scores.alternative,d=b.total-a.total;
        return <tr key={q.id}><th scope="row">{q.id}</th><td><strong>{formatScore(a.total)}</strong><small>{a.classification}</small></td><td><strong>{formatScore(b.total)}</strong><small>{b.classification}</small></td><td>{d>0?'+':''}{formatScore(d)} ponto(s)</td></tr>;
      })}</tbody></table></div>
    </section>
    <section id="benchmark-evidence" className="benchmark-section">
      <div className="section-head"><h3>Audite cada comparação</h3><p>Textos integrais preservados. Resumos editoriais identificados; julgamento e revisão têm autoria separada.</p></div>
      <div className="benchmark-toggle" role="group" aria-label="Selecionar embate das evidências">{modes.map(m=><button key={m} className={`action ${mode===m?'primary':''}`} aria-pressed={mode===m} onClick={()=>setMode(m)}>{modeLabel(m)} × {benchmark.alternativeLabel}</button>)}</div>
      <nav className="benchmark-nav" aria-label="Perguntas">{benchmark.questions.map(q=><a href={`#${q.id}`} key={q.id}>{q.id}</a>)}</nav>
      <SelectFilter label="Filtrar pergunta" value={questionFilter} onChange={setQuestionFilter} options={[{value:'all',label:'Todas as cinco perguntas'},...benchmark.questions.map(q=>({value:q.id,label:`${q.id} · ${q.title}`}))]}/>{benchmark.questions.filter(q=>questionFilter==='all'||q.id===questionFilter).map(q=><QuestionEvidence key={q.id} q={q} mode={mode}/>)}
    </section>
    <Protocol/>
    {benchmark.conclusion && <section className="benchmark-section"><div className="section-head"><h3>Conclusão dentro da amostra</h3></div><p>{benchmark.conclusion}</p></section>}
    <EvidenceIndex/>
    <Downloads files={report.files}/>
  </div>;
}

export default function BenchmarkReport({report}:{report:Report}) {
  return <BenchmarkContext.Provider value={getBenchmark(report.benchmarkId!)}><BenchmarkBody key={report.id} report={report}/></BenchmarkContext.Provider>;
}
