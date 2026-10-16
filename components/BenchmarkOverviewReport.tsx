import Link from 'next/link';
import data from '@/content/sintese-benchmarks-interface-2026-10-16.json';
import type {Report} from '@/lib/types';
import EvidenceGallery from './EvidenceGallery';
import Downloads from './Downloads';

type Benchmark=typeof data.benchmarks[number];
type Series=Benchmark['series'][number];
const fmt=(n:number)=>n.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:2});
const delta=(n:number)=>`${n>0?'+':''}${fmt(n)}`;
const modeName=(m:string)=>m==='agil'?'Ágil':'Pleno';
const date=(d:string)=>`${d.slice(8,10)}/${d.slice(5,7)}/${d.slice(0,4)}`;

function Marker({x,y,color,shape,size=6}:{x:number;y:number;color:string;shape:string;size?:number}) {
  const attrs={fill:'white',stroke:color,strokeWidth:2.5};
  if(shape==='square')return <rect x={x-size} y={y-size} width={size*2} height={size*2} {...attrs}/>;
  if(shape==='diamond')return <polygon points={`${x},${y-size-2} ${x+size+2},${y} ${x},${y+size+2} ${x-size-2},${y}`} {...attrs}/>;
  if(shape==='triangle')return <polygon points={`${x},${y-size-2} ${x+size+2},${y+size} ${x-size-2},${y+size}`} {...attrs}/>;
  return <circle cx={x} cy={y} r={size} {...attrs}/>;
}
function Swatch({series}:{series:Series}) {
  return <svg className="overview-swatch" viewBox="0 0 48 22" aria-hidden="true"><line x1="0" x2="48" y1="11" y2="11" stroke={series.color} strokeWidth="2.5" strokeDasharray={series.dash}/><Marker x={24} y={11} color={series.color} shape={series.marker} size={4}/></svg>;
}
function MeanFigure({b}:{b:Benchmark}) {
  const plot=b.plot;
  return <figure className="overview-figure" aria-labelledby={`figure-${b.key}`}>
    <figcaption><h4 id={`figure-${b.key}`}>{b.label}</h4><p>Juiz: {b.judge}</p></figcaption>
    <svg className="overview-svg" viewBox={`0 0 ${plot.width} ${plot.height}`} role="img" aria-labelledby={`svg-${b.key}`} aria-describedby={`desc-${b.key}`}>
      <title id={`svg-${b.key}`}>Médias por execução · {b.label}</title><desc id={`desc-${b.key}`}>Escala de zero a dez. Quatro séries independentes; todos os valores e diferenças estão na tabela imediatamente abaixo. Rótulos deslocados usam linhas-guia, sem mover os pontos.</desc>
      {[0,2,4,6,8,10].map(t=>{const y=plot.bottom-t/10*(plot.bottom-plot.top);return <g key={t}><line x1={plot.x[0]} x2={plot.x[1]} y1={y} y2={y} stroke="#dce8e0"/><text x={plot.x[0]-13} y={y+6} textAnchor="end" className="overview-axis">{t}</text></g>;})}
      {b.series.map((s,i)=>{const pts=plot.points[i];return <g key={s.id}><line x1={pts[0].x} y1={pts[0].y} x2={pts[1].x} y2={pts[1].y} stroke={s.color} strokeWidth="3" strokeDasharray={s.dash}/>{pts.map((p,j)=><g key={j}><line x1={p.x+(j===0?-9:9)} x2={plot.leaderX[j]} y1={p.y} y2={p.labelY} stroke={s.color} strokeWidth="1"/><Marker x={p.x} y={p.y} color={s.color} shape={s.marker}/><text x={plot.labelX[j]} y={p.labelY+6} textAnchor="middle" fill={s.color} className="overview-value">{fmt(s.values[j])}</text></g>)}</g>;})}
      {plot.x.map((x,i)=><g key={x}><text x={x} y="290" textAnchor="middle">Run 0{i+1}</text><text x={x} y="316" textAnchor="middle" className="overview-axis">{date(b.dates[i])}</text></g>)}
    </svg>
    <div className="benchmark-table-wrap" tabIndex={0} role="region" aria-label={`Valores exatos das médias de ${b.label}`}><table className="overview-means"><caption>Legenda e valores exatos · 5 notas em cada execução e série</caption><thead><tr><th scope="col">Série</th><th scope="col">Run 01</th><th scope="col">Run 02</th><th scope="col">Δ média</th></tr></thead><tbody>{b.series.map(s=><tr key={s.id}><th scope="row"><Swatch series={s}/>{s.label}</th><td>{fmt(s.values[0])}</td><td>{fmt(s.values[1])}</td><td>{delta(s.delta)}</td></tr>)}</tbody></table></div>
  </figure>;
}
function QuestionFigure({b,mode}:{b:Benchmark;mode:string}) {
  const rows=b.rows.filter(r=>r.mode===mode),color=mode==='agil'?'#17645b':'#235ca0';
  const y=(n:number)=>235-n/10*200,x=(i:number)=>56+i*57;
  return <figure className="overview-figure overview-small"><figcaption><h4>VadeChat {modeName(mode)} · notas por pergunta</h4><p>Run 01: círculo e tracejado cinza · Run 02: quadrado e linha {mode==='agil'?'verde':'azul'}</p></figcaption>
    <svg className="overview-svg" viewBox="0 0 320 285" role="img" aria-label={`${b.label}, VadeChat ${modeName(mode)}, Run 01 e Run 02 por pergunta. Valores exatos na tabela abaixo.`}>
      {[0,2,4,6,8,10].map(t=><g key={t}><line x1="56" x2="284" y1={y(t)} y2={y(t)} stroke="#dce8e0"/><text x="32" y={y(t)+6} textAnchor="end" className="overview-axis">{t}</text></g>)}
      {(['old','new'] as const).map(p=><g key={p}><polyline points={rows.map((r,i)=>`${x(i)},${y(r[p].vc.total)}`).join(' ')} fill="none" stroke={p==='old'?'#66757d':color} strokeWidth="3" strokeDasharray={p==='old'?'8 5':undefined}/>{rows.map((r,i)=>{const newHigher=r.new.vc.total>r.old.vc.total;const above=p==='new'?newHigher:!newHigher;return <g key={r.id}><Marker x={x(i)} y={y(r[p].vc.total)} shape={p==='old'?'circle':'square'} color={p==='old'?'#66757d':color} size={5}/><text x={x(i)} y={y(r[p].vc.total)+(above?-13:23)} textAnchor="middle" fill={p==='old'?'#53636b':color}>{fmt(r[p].vc.total)}</text></g>;})}</g>)}
      {rows.map((r,i)=><text x={x(i)} y="275" textAnchor="middle" key={r.id}>{r.question}</text>)}
    </svg>
  </figure>;
}
function BenchmarkDetails({b}:{b:Benchmark}) {
  return <details className="overview-details benchmark-question" id={`details-${b.key}`}>
    <summary><strong>{b.label}</strong><span>5 perguntas · notas, contribuições e adversário fixo</span></summary>
    <p><strong>Juiz:</strong> {b.judge}. <strong>Adversário:</strong> {b.opponent}. <strong>Revisor:</strong> {b.reviewer}. Configurações informadas pelo executor.</p>
    <div className="overview-two">{['agil','pleno'].map(mode=><QuestionFigure b={b} mode={mode} key={mode}/>)}</div>
    <div className="benchmark-table-wrap" tabIndex={0} role="region" aria-label={`${b.label}: médias e contagens`}><table><caption>Mesmas cinco perguntas pareadas · denominador 5 em cada modo e execução</caption><thead><tr><th scope="col">Modo</th><th scope="col">Run 01</th><th scope="col">Run 02</th><th scope="col">Δ média</th><th scope="col">Subiram / caíram / iguais</th></tr></thead><tbody>{(['agil','pleno'] as const).map(m=>{const s=b.summaries[m];return <tr key={m}><th scope="row">{modeName(m)}</th><td>{fmt(s.old)}</td><td>{fmt(s.new)}</td><td>{delta(s.delta)}</td><td>{s.up} / {s.down} / {s.same}</td></tr>;})}</tbody></table></div>
    <h4>Quanto cada pergunta contribuiu</h4><p>Diferença da nota ÷ 5. Contribuições se somam à variação da média, em pontos.</p>
    <div className="benchmark-table-wrap" tabIndex={0} role="region" aria-label={`${b.label}: diferenças por pergunta`}><table><caption>Notas originais do VadeChat · escala 0–10</caption><thead><tr><th scope="col">Questão</th><th scope="col">Modo</th><th scope="col">Run 01 → 02</th><th scope="col">Δ nota</th><th scope="col">Contribuição à média</th></tr></thead><tbody>{b.rows.map(r=><tr key={r.id}><th scope="row">{r.question}</th><td>{modeName(r.mode)}</td><td>{fmt(r.old.vc.total)} → {fmt(r.new.vc.total)}</td><td>{delta(r.delta)}</td><td>{delta(r.contribution)}</td></tr>)}</tbody></table></div>
    <h4>Mesma resposta adversária, notas diferentes</h4><p>{b.changedOpponent} de 10 embates mudaram a nota de uma resposta adversária idêntica entre execuções. Isso registra oscilação na avaliação, sem isolar sua causa.</p>
    <div className="benchmark-table-wrap" tabIndex={0} role="region" aria-label={`Notas de ${b.alternative} contra os dois modos`}><table><caption>{b.alternative} · séries separadas contra Ágil e Pleno</caption><thead><tr><th scope="col">Questão</th><th scope="col">Modo adversário</th><th scope="col">Run 01 → 02</th><th scope="col">Δ nota</th></tr></thead><tbody>{b.rows.map(r=><tr key={r.id}><th scope="row">{r.question}</th><td>Contra {modeName(r.mode)}</td><td>{fmt(r.old.opponent.total)} → {fmt(r.new.opponent.total)}</td><td>{delta(r.opponentDelta)}</td></tr>)}</tbody></table></div>
    <details className="overview-notes"><summary>Mudanças e ressalvas por pergunta — sínteses editoriais</summary>{b.rows.map(r=><div className="overview-row-note" key={r.id}><h5>{r.question} · {modeName(r.mode)}</h5><p><strong>Resposta:</strong> {r.shortChange}</p><p><strong>Revisão:</strong> {r.review}</p><Link href={`/relatorios/${b.comparisonId}/#${r.id}`}>Consultar comparação e textos integrais →</Link></div>)}</details>
    <p><Link className="action" href={`/relatorios/${b.comparisonId}/`}>Abrir comparativo completo de {b.label}</Link></p>
  </details>;
}
export default function BenchmarkOverviewReport({report}:{report:Report}) {
  return <div className="benchmark benchmark-overview">
    <div className="meta"><span className="tag">Síntese visual</span><span className="tag">2 benchmarks · 6 capturas</span></div>
    <p className="benchmark-subtitle">Duas execuções por conjunto. Quatro recortes do VadeChat. Avanços de interface documentados.</p>
    <p>{data.period}</p>
    <nav className="benchmark-nav" aria-label="Seções da síntese"><a href="#overview-results">Médias</a><a href="#overview-figure">Trajetórias</a><a href="#overview-detail">Por pergunta</a><a href="#overview-ui">Interface</a><a href="#overview-method">Método e fontes</a></nav>
    <section id="overview-results" className="benchmark-section"><h3>O que mudou nas médias</h3>
      <div className="overview-metrics">{data.benchmarks.flatMap(b=>(['agil','pleno'] as const).map(m=>{const s=b.summaries[m];return <div key={b.key+m} className={`overview-metric ${m}`}><span>{b.label}</span><strong>VadeChat {modeName(m)}</strong><b>{fmt(s.old)} → {fmt(s.new)}</b><span>Δ média <em>{delta(s.delta)}</em> · {s.denominator} perguntas pareadas</span></div>;}))}</div>
      <p>{data.lead}</p><p className="benchmark-caveat">{data.caveat}</p>
    </section>
    <section id="overview-figure" className="benchmark-section"><h3>Trajetórias observadas — médias de 0 a 10</h3><p>Mesma escala nos dois painéis. As respostas adversárias são fixas, mas suas duas séries de avaliação são preservadas.</p>
      <div className="overview-two">{data.benchmarks.map(b=><MeanFigure b={b} key={b.key}/>)}</div>
      <p className="note">{data.figureNote} Os valores nas extremidades usam linhas-guia quando próximos; os pontos conservam suas posições exatas na escala.</p>
    </section>
    <section className="benchmark-section"><h3>Ganhos concentrados, avaliação variável</h3><div className="overview-two">{data.benchmarks.map(b=><aside className="overview-callout" key={b.key}><h4>{b.label}</h4><p>{b.concentration}</p><p><strong>Adversário fixo:</strong> {b.changedOpponent}/10 embates com mudança de nota.</p><p className="note"><strong>Revisões — síntese editorial:</strong> {b.review}</p></aside>)}</div></section>
    <section id="overview-detail" className="benchmark-section"><h3>Detalhamento compacto por conjunto</h3><p>Q01–Q05 têm conteúdos distintos nos dois benchmarks. Abra cada conjunto para ver gráficos por modo, contribuições e variação do adversário.</p>{data.benchmarks.map(b=><BenchmarkDetails b={b} key={b.key}/>)}</section>
    <section id="overview-ui" className="benchmark-section"><h3>Avanços de interface documentados</h3><p>Capturas originais e relato do usuário. Esta rodada não executa testes na Alia/VadeChat e não atribui a essas mudanças a variação das notas.</p>
      {data.improvements.map(item=><article className="overview-improvement" id={item.id} key={item.id}><div className="meta"><span className="tag">{item.id}</span><span className="tag">{item.status}</span></div><h4>{item.title}</h4><p><strong>O que a imagem mostra:</strong> {item.description}</p><p><strong>Relato do usuário:</strong> {item.reported}</p><p><strong>Utilidade esperada:</strong> {item.benefit}</p><p className="note">{item.limit}</p><EvidenceGallery ids={item.evidenceIds}/><div className="benchmark-actions">{item.comparisons.map(c=><Link className="action compare" key={c.findingId} href={`/relatorios/${c.reportId}/#${c.findingId}`}>{c.label} →</Link>)}</div></article>)}
    </section>
    <section id="overview-method" className="benchmark-section"><h3>Método, limites e fontes</h3><p>{data.formula}</p><details className="overview-details benchmark-question"><summary>Conferência das fontes e limites da interpretação</summary><ul>{data.method.map(s=><li key={s}>{s}</li>)}</ul></details><p>Os comparativos completos preservam perguntas, referências, respostas, pareceres, revisões e prompts registrados. O índice desta síntese é um documento gerado, com hashes, versões e vínculos; não é manifesto original nem prova independente de envio.</p>
      <Downloads files={report.files}/><div className="benchmark-actions"><a className="action" href={`/reports/${data.id}.md`} download>Markdown editável</a><a className="action" href={data.dataPath} download>Dados e cálculos · JSON</a><a className="action" href={data.auditPath} download>Índice de fontes e SHA-256</a></div>
      <div className="overview-related">{data.benchmarks.map(b=><Link href={`/relatorios/${b.comparisonId}/`} key={b.key}>Comparativo completo · {b.label} →</Link>)}</div>
      <details className="benchmark-hash"><summary>SHA-256 das seis capturas originais</summary>{data.images.map(i=><p key={i.id}>{i.id} · <a href={i.path} download>Baixar original</a><br/><code>{i.sha256}</code></p>)}</details>
    </section>
  </div>;
}
