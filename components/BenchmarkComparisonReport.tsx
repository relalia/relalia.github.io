'use client';

import Link from 'next/link';
import {getComparison, type ComparisonData} from '@/lib/comparisons';
import type {Report} from '@/lib/types';
import type {SourceDocument} from '@/lib/benchmark';
import {TextEvidence} from './BenchmarkReport';
import Downloads from './Downloads';

type Row=ComparisonData['rows'][number];
type Run='old'|'new';

const modeLabel=(mode:string)=>mode==='agil'?'Ágil':'Pleno';
const fmt=(n:number)=>n.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:2});
const delta=(n:number)=>`${n>0?'+':''}${fmt(n)}`;
const result=(r:Row,p:Run,alternative:string)=>r[p].winner==='tie'?'Empate comum':r[p].winner==='vc'?`VadeChat ${modeLabel(r.mode)} venceu`:r[p].winner==='inconclusive'?'Inconclusivo':`${alternative} venceu`;
const sources=(r:Row,p:Run)=>r.sources[p] as unknown as Record<string,string>;

function RunEvidence({row,run,data}:{row:Row;run:Run;data:ComparisonData}) {
  const docs:Record<string,SourceDocument>=data.documents;
  const alternative=data.alternativeLabel??'ChatGPT gratuito';
  const s=sources(row,run);
  const titles:[string,string][]=[['question','Pergunta integral'],['reference','Referência humana integral · inclui metadados originais'],['opponent',`Resposta integral · ${alternative}`],[row.mode,`Resposta integral · VadeChat ${modeLabel(row.mode)}`],[`judgment:${row.mode}`,`Julgamento integral · ${data.judgeLabel??'Claude Sonnet 5.5 Médio'}`],[`review:${row.mode}`,'Revisão integral · GPT 6.1 Sol Alto'],['mapping','Registro local da alternância A/B']];
  return <div className="comparison-run"><h5>{data.runLabels?.[run]??(run==='old'?'Run 01 · legado01 · 09/10/2026':'Run 02 · 14/10/2026')}</h5>
    {titles.map(([slot,label])=><TextEvidence key={slot} document={docs[s[slot]]} label={label}/>)}
    {run==='new'?<><TextEvidence document={docs[row.prompt]} label="Prompt registrado e vinculado ao julgamento"/><TextEvidence document={docs[row.reviewPrompt]} label="Prompt registrado e vinculado à revisão"/><p className="note">O texto copiado e a declaração de envio estão registrados; isso não comprova o envio independentemente. Julgamento vinculado ao prompt {row.promptId}; revisão ao prompt {row.reviewPromptId}.</p></>:<p className="benchmark-caveat">Prompts completos de julgamento e revisão ausentes no legado. Nenhuma reconstrução é apresentada como registro de envio.</p>}
  </div>;
}

function ComparisonDetail({row,data}:{row:Row;data:ComparisonData}) {
  const alternative=data.alternativeLabel??'ChatGPT gratuito';
  return <details className="benchmark-question comparison-detail" id={row.id}>
    <summary><strong>{row.question} · {modeLabel(row.mode)}</strong><span>{fmt(row.old.vc.total)} → {fmt(row.new.vc.total)} · variação {delta(row.delta)}</span></summary>
    <div><h4>{row.question} · VadeChat {modeLabel(row.mode)} × {alternative}</h4>
      <p><strong>Mudança observável na resposta:</strong> {row.change}</p>
      <p><strong>Justificativa do juiz — síntese editorial:</strong> {row.support}</p>
      <div className="benchmark-table-wrap" tabIndex={0} role="region" aria-label={`${row.question} ${modeLabel(row.mode)}: notas e classificações originais`}><table><caption>Resultados originais · escala 4 + 4 + 2 = 10</caption><thead><tr><th scope="col">Execução</th><th scope="col">Participante</th><th scope="col">Conclusão (0–4)</th><th scope="col">Fundamentação (0–4)</th><th scope="col">Ressalvas (0–2)</th><th scope="col">Total</th><th scope="col">Classificação</th></tr></thead><tbody>
        {(['old','new'] as Run[]).flatMap(p=>(['vc','opponent'] as const).map(w=><tr key={p+w}><th scope="row">{p==='old'?'Run 01':'Run 02'}</th><td>{w==='vc'?`VadeChat ${modeLabel(row.mode)}`:alternative}</td>{row[p][w].criteria.map((n,i)=><td key={i}>{fmt(n)}</td>)}<td>{fmt(row[p][w].total)}<small>Soma: {fmt(row[p][w].sum)}</small></td><td>{row[p][w].classification}</td></tr>))}
      </tbody></table></div>
      {(['old','new'] as Run[]).map(p=><p className="benchmark-result" key={p}><strong>{p==='old'?'Run 01':'Run 02'}: {result(row,p,alternative)}</strong> · resultado histórico do juiz, preservado.</p>)}
      <p className="note">A = {row.mapping.A==='opponent'?alternative:`VadeChat ${modeLabel(row.mode)}`}; B = {row.mapping.B==='opponent'?alternative:`VadeChat ${modeLabel(row.mode)}`}. Pontuação, classificação e vitória permanecem distintas.</p>
      <aside className="benchmark-review"><strong>Revisões antiga e nova — síntese editorial</strong><p>{row.review}</p><small>Os textos integrais estão abaixo. A revisão não substitui notas, classificações ou vencedores originais.</small></aside>
      <RunEvidence row={row} run="old" data={data}/><RunEvidence row={row} run="new" data={data}/>
      <p className="benchmark-filename">Pergunta Run 01: {row.identities.oldQuestion}. Pergunta Run 02: {row.identities.newQuestion}. Benchmark {data.benchmarkId}. Versões e vínculos completos no índice de auditoria.</p>
    </div>
  </details>;
}

export default function BenchmarkComparisonReport({report}:{report:Report}) {
  const data=getComparison(report.comparisonId);
  const docs:Record<string,SourceDocument>=data.documents;
  const alternative=data.alternativeLabel??'ChatGPT gratuito';
  const modes=['agil','pleno'] as const;
  return <div className="benchmark benchmark-comparison">
    <div className="meta"><span className="tag">Reteste comparativo</span><span className="tag">5 perguntas · 10 pares · 20 julgamentos históricos</span></div>
    <p className="benchmark-subtitle">{data.runLabels?`${data.runLabels.old} → ${data.runLabels.new}`:'Run 01 · 09/10/2026 (legado01) → Run 02 · 14/10/2026'}</p>
    <nav className="benchmark-nav" aria-label="Seções do comparativo"><a href="#comparison-results">Resultados</a><a href="#comparison-table">Dez comparações</a><a href="#comparison-changes">Mudanças e textos integrais</a><a href="#comparison-reviews">Revisões</a><a href="#comparison-integrity">Integridade e método</a><a href="#comparison-downloads">Evidências e downloads</a></nav>
    <section id="comparison-results" className="benchmark-section"><h3>Resumo dos resultados</h3>
      <div className="benchmark-score-grid">{modes.map(m=><div className="vc-stat" key={m}><span>VadeChat {modeLabel(m)} · média de cinco notas</span><strong>{fmt(data.summary[m].old)} → {fmt(data.summary[m].new)}</strong><span>Variação {delta(data.summary[m].delta)} ponto</span></div>)}</div>
      <div className="benchmark-table-wrap" tabIndex={0} role="region" aria-label="Médias e contagens por modo"><table><caption>Notas originais · cinco pares completos por modo</caption><thead><tr><th scope="col">Modo</th><th scope="col">Média anterior</th><th scope="col">Média nova</th><th scope="col">Variação</th><th scope="col">Subiram / caíram / iguais</th></tr></thead><tbody>{modes.map(m=>{const s=data.summary[m];return <tr key={m}><th scope="row">{modeLabel(m)}</th><td>{fmt(s.old)}</td><td>{fmt(s.new)}</td><td>{delta(s.delta)}</td><td>{s.up} / {s.down} / {s.same}</td></tr>;})}</tbody></table></div>
      <ul className="highlights">{data.highlights.map(h=><li key={h}>{h}</li>)}</ul>
      <p>{data.editorial.lead}</p><p className="benchmark-caveat">{data.caveat}</p>
      <p className="note">{data.editorial.denominatorNote??'Médias calculadas com as cinco notas presentes em cada modo e execução, sem arredondamento intermediário. Nenhuma ausência vira zero. Q05 permanece no resumo histórico, com a inconclusividade solicitada pelo revisor destacada.'}</p>
      <p className="note">{data.editorial.roles??'Participantes: VadeChat Ágil, VadeChat Pleno e ChatGPT gratuito. Referência: respostas humanas fornecidas. Juiz declarado: Claude Sonnet 5.5 Médio. Revisor declarado: GPT 6.1 Sol Alto, acesso pago. O revisor não gerou as respostas adversárias. Modelo do participante ChatGPT: não identificado.'}</p>
    </section>
    <section id="comparison-table" className="benchmark-section"><h3>Tabela comparativa das dez avaliações</h3><div className="benchmark-table-wrap" tabIndex={0} role="region" aria-label="Dez pares de notas do VadeChat"><table className="comparison-table"><caption>VadeChat · notas originais do juiz · de 0 a 10</caption><thead><tr>{['Pergunta','Modo','Nota anterior do VC','Nota nova do VC','Variação','Mudança principal'].map(h=><th scope="col" key={h}>{h}</th>)}</tr></thead><tbody>{data.rows.map(r=><tr key={r.id}><th scope="row"><a href={`#${r.id}`}>{r.question}</a></th><td>{modeLabel(r.mode)}</td><td>{fmt(r.old.vc.total)}</td><td>{fmt(r.new.vc.total)}</td><td>{delta(r.delta)}</td><td>{r.change}</td></tr>)}</tbody></table></div>
      <p className="note">{data.editorial.outcomeNote??'Resultados originais do VadeChat (vitórias/empates comuns/derrotas): Ágil 1/1/3 → 1/0/4; Pleno 2/2/1 → 2/1/2. Não houve abstenções ou resultados inconclusivos originalmente atribuídos. A solicitação de inconclusividade em Q05 pertence à revisão.'}</p>
    </section>
    <section id="comparison-changes" className="benchmark-section"><h3>Mudanças por pergunta e modo</h3><p>Abra uma comparação para consultar a mudança, a justificativa do juiz, as ressalvas dos revisores e os textos integrais das duas execuções.</p>{data.rows.map(r=><ComparisonDetail row={r} data={data} key={r.id}/>)}</section>
    <section id="comparison-reviews" className="benchmark-section"><h3>Ressalvas dos revisores e oscilação de avaliação</h3><p>{data.editorial.oscillation}</p>
      <div className="benchmark-table-wrap" tabIndex={0} role="region" aria-label="Notas do adversário fixo em cada execução"><table><caption>{alternative} · mesma resposta em cada questão · duas séries preservadas</caption><thead><tr><th scope="col">Questão</th><th scope="col">Contra Ágil · Run 01 → 02</th><th scope="col">Contra Pleno · Run 01 → 02</th></tr></thead><tbody>{['Q01','Q02','Q03','Q04','Q05'].map(q=><tr key={q}><th scope="row">{q}</th>{modes.map(m=>{const r=data.rows.find(r=>r.question===q&&r.mode===m)!;return <td key={m}>{fmt(r.old.opponent.total)} → {fmt(r.new.opponent.total)}</td>;})}</tr>)}</tbody></table></div>
      {data.editorial.reviewHighlights?<aside className="benchmark-review"><strong>Ressalvas que afetam a interpretação</strong>{data.editorial.reviewHighlights.map(s=><p key={s}>{s}</p>)}</aside>:<aside className="benchmark-review"><strong>Ressalvas que afetam a interpretação</strong><p>Q02: a nova revisão aponta conteúdos já presentes e descontos insuficientemente justificados nos dois modos. Q03 Ágil: questiona o único desconto que determina a derrota. Q04: questiona descrição, distribuição de pontos e aplicação da regra de zero.</p><p>Q05: a referência não permite avaliar a validade da ficha. O revisor pede inconclusividade global, preservando apenas a comparação delimitada dos requisitos. As notas e vitórias históricas continuam visíveis, sem resultado corrigido inventado.</p></aside>}
      <p>{data.conclusion}</p>
    </section>
    <section id="comparison-integrity" className="benchmark-section"><h3>Integridade, metodologia e limitações</h3><ul className="benchmark-limitations">{data.editorial.integrity.map(s=><li key={s}>{s}</li>)}</ul><p className="benchmark-caveat">{data.editorial.formal}</p><p>{data.pending}</p>
      <details className="benchmark-question"><summary>Protocolos e instruções integrais</summary>{(['old','new'] as Run[]).map(p=><div key={p}><h4>{p==='old'?'Run 01 · legado01':'Run 02'}</h4><TextEvidence document={docs[data.protocol[p].global]} label="Protocolo-base integral · global_prompt.txt"/><TextEvidence document={docs[data.protocol[p].alternation]} label="Alternância A/B integral · answer_alternation.txt"/>{p==='new'?<TextEvidence document={docs[data.protocol.new.reviewInstructions]} label="Instruções de revisão registradas · review_prompt.txt"/>:<p>Instruções de revisão não registradas no legado.</p>}</div>)}</details>
    </section>
    <section id="comparison-downloads" className="benchmark-section"><h3>Evidências e downloads</h3><Downloads files={report.files}/><div className="benchmark-actions"><a className="action" href={`/reports/${data.id}.md`} download>Baixar texto editável</a><a className="action" href={`/reports/${data.id}-auditoria.json`} download>Baixar índice de auditoria e SHA-256</a></div>
      <p className="note">Índice gerado a partir das fontes, com identidades, versões, procedência declarada e vínculos. Não é um manifesto original nem prova independente de envio. Os arquivos históricos são disponibilizados byte a byte. Backups administrativos e rascunhos internos não integram os anexos.</p>
      <details className="benchmark-question"><summary>Índice dos {Object.keys(docs).length} arquivos pertinentes</summary><ul className="comparison-source-index">{Object.entries(docs).map(([key,d])=><li key={key}><a href={d.path} download>{key}</a><code>{d.sha256}</code></li>)}</ul></details>
      <h4>Relatórios relacionados</h4>{data.related.map(r=><p key={r.id}><Link href={`/relatorios/${r.id}/`}>{r.label}</Link></p>)}
    </section>
  </div>;
}
