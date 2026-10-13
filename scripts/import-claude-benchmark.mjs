// Document executor artifacts only. No new answers, judgments or legal evaluation.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {statistics} from '../lib/benchmark-math.mjs';
const source=process.argv[2];
if(!source) throw Error('Usage: node scripts/import-claude-benchmark.mjs SOURCE_DIRECTORY');
const id='benchmark-claude-2026-10-13',documents=new Map();
function read(relative) {
  if(documents.has(relative))return documents.get(relative);
  const result=spawnSync(process.execPath,['scripts/register-original.mjs',path.join(source,relative),`/originals/benchmark/${id}/${relative}`],{encoding:'utf8'});
  if(result.status!==0)throw Error(result.stderr||result.stdout);
  const doc={...JSON.parse(result.stdout),text:fs.readFileSync(path.join(source,relative),'utf8')};documents.set(relative,doc);return doc;
}
const protocol=read('Aval/global_prompt.txt'),alternation=read('Aval/answer_alternation.txt');
const clean=s=>s.replace(/\\\./g,'.').replace(/\*\*/g,'').trim();
const numeric=s=>{const match=clean(s).match(/^(\d+(?:[,.]\d+)?)(?:\s*\/\s*10)?$/);return match?Number(match[1].replace(',','.')):null;};
const reviews={
  agil:[
    ['O revisor distingue autorizar a lavratura de garantir o registro e questiona o uso da mesma omissão em três critérios. A frase de B sobre o registro gera tensão, sem declarar registrabilidade automática.','A vitória do Claude é considerada coerente, mas o tamanho dos descontos e a classificação do Ágil dependem da interpretação integral. Nota máxima não valida informações adicionais.','Revisar descontos por critério e justificar a classificação conforme a interpretação adotada.'],
    ['A assinatura do técnico está expressa no Ágil, mas foi tratada como ausente. Há possível desconto duplicado em ambas; o “Não” do Claude trata da atribuição aos parágrafos, não necessariamente da exigência no cenário.','A diferença de 1 ponto e a justificativa do vencedor precisam de revisão. A ausência da condição específica de dispensa permanece demonstrada; cautela sobre fontes não recebe crédito por si só.','Revisar pontuação, justificativa do vencedor e classificação conforme a leitura da resposta integral.'],
    ['Dificuldade de acesso às fontes não substitui condições do gabarito. Exigências adicionais não confirmadas não podem gerar desconto por si; a ressalva do Ágil sobre contratos/estatutos não dispensa automaticamente prazos de certidões simplificadas.','O revisor considera a vitória do Ágil bem fundamentada, mas questiona a distribuição dos pontos. A referência não delimita a aplicação da frase final sobre 30 dias para certidão específica.','Revisar distribuição de pontos; preservar a lacuna da referência sem completá-la.'],
    ['Ágil apresenta “CIF ou CIB”, enquanto o gabarito usa “CIF e CIB”, e altera o enquadramento do georreferenciamento. Claude menciona CNM; a deficiência é sua apresentação como requisito, não ausência absoluta. Unidades de área omitidas não foram apontadas.','A vitória do Ágil é plausível, mas Conforme pode ser incompatível com uma contradição considerada essencial. Os pontos de ressalvas carecem de justificativa comparativa.','Revisar classificação do Ágil e distribuição dos pontos, sem concluir erro jurídico externo.'],
    ['Claude omite o fato obrigatório Código Civil; Ágil o atende e menciona pessoas capazes. Exigir os mesmos artigos seria inadequado. A individualização de poderes está incompleta em ambas; conteúdo sobre procuradores não gera desconto por si.','A margem de 0,5 ponto a favor do Claude não está suficientemente sustentada. Igualdade de fundamentação e diferença de ressalvas precisam de explicação.','Revisar pontuação e vencedor, sem inventar resultado corrigido.'],
  ],
  pleno:[
    ['Ambas abordam os limites entre lavratura e registro. O desconto deve considerar o significado integral: Claude menciona registrador/juízo e Pleno trata da qualificação e cancelamento judicial.','Empate considerado sustentado. A mesma resposta do Claude recebeu 10 contra Ágil e 9,5 contra Pleno; isso aponta necessidade de calibrar critérios, sem demonstrar causa.','Preservar empate e calibrar a pontuação individual; não exigir reprodução literal.'],
    ['Pleno apresenta assinaturas do proprietário, técnico e confinantes e trata de anuência. Esses elementos não precisam estar todos na “Resposta direta”. O “Não” do Claude não demonstra isoladamente negação da exigência.','A diferença de 2 pontos exige revisão dos descontos. Permanece a possível incompletude da declaração específica do requerente e da condição de dispensa.','Revisar descontos e justificativa; descrever fielmente a relação entre matrícula, marcos e confrontante.'],
    ['A mesma resposta do Claude passou de 4,5 para 5,5, com aumento em conclusão e fundamentação. Pleno apresenta conteúdo parcialmente correspondente sobre transferência de bens, ainda sem extinção societária.','A vantagem do Pleno é defensável, mas a margem e a igualdade de fundamentação não estão suficientemente justificadas. Cautela sobre fontes não substitui prazos; a referência deixa indeterminada a aplicação dos 30 dias da certidão específica.','Calibrar pontuação e preservar a lacuna do gabarito.'],
    ['O juiz não registra todas as omissões do Pleno: CEP apenas urbano, localização rural, uso de dados de escrituras no saneamento, primeiro registro voluntário e certificação facultativa. O CIB urbano é condicionado à implantação. Claude menciona CNM e CIB/NIRF.','A vantagem do Pleno é sustentada pela cobertura, mas 9 pontos devem ser lidos com essas omissões adicionais. A mesma resposta do Claude caiu de 7 para 6 em fundamentação e ressalvas.','Preservar vitória e notas; registrar omissões adicionais e calibrar a pontuação individual do juiz.'],
    ['Pleno afirma “Toda pessoa capaz tem aptidão para outorgar mandato”; a suposta ausência de capacidade é erro de leitura. Instrumentos separados são recomendação, não proibição de poderes distintos. O juiz premia efeitos da revogação em Claude e depois os chama de não verificáveis.','A diferença de 1,5 ponto e o vencedor não estão suficientemente sustentados. Pleno atende ao fato obrigatório Código Civil; artigos diferentes não são falsos por si. A individualização dos poderes permanece incompleta em ambas.','Revisar notas e vencedor; manter o resultado original como registro, sem pontuação corrigida inventada.'],
  ],
};
const titles=['Escritura com indisponibilidade','Declaração de respeito aos limites','Documentos da Junta Comercial','Identificação e saneamento da matrícula','Procuração com vários outorgantes'];
const questions=titles.map((title,i)=>{
  const n=String(i+1).padStart(2,'0'),qid=`Q${n}`;
  const match=alternation.text.match(new RegExp(`${qid}: A \\((Claude|Vadechat)\\) x B \\((Claude|Vadechat)\\)`));
  if(!match)throw Error(`Missing A/B ${qid}`);
  const order={A:match[1]==='Claude'?'alternative':'vadechat',B:match[2]==='Claude'?'alternative':'vadechat'};
  const question=read(`Perguntas/${qid}.txt`),human=read(`Respostas/Humano/R${n}_Humano.txt`),alternative=read(`Respostas/Claude/R${n}_Claude.txt`);
  const referenceText=human.text.split(/\r?\n(?:Variações da pergunta|Fatos obrigatórios)/)[0].trim();
  const administrativeText=human.text.slice(referenceText.length).trim();
  const fact=human.text.match(/Fatos obrigatórios \(\d+\)\r?\n([\s\S]*?)\r?\npeso ([\d.]+)/);
  const mandatoryFacts=fact?[{text:fact[1],weight:Number(fact[2]),source:human.path}]:[];
  const referenceNotes=human.text.match(/Obs\. revisão:([\s\S]*)$/)?.[1]?.trim()||'';
  const comparisons={};
  for(const [mode,folder] of [['agil','Agil'],['pleno','Pleno']]) {
    const base=`Aval/VC_${folder}_x_Claude`,document=read(`${base}/Pontuacoes/R${n}_VC_${folder}_x_Claude.txt`),review=read(`${base}/Notas_GPT6.1/R${n}_VC_${folder}_x_Claude_Nota_GPT6.1.txt`);
    const rows=document.text.split(/\r?\n/).filter(line=>line.startsWith('|')).map(line=>line.split('|').slice(1,-1).map(clean));
    const scores={};
    for(const letter of ['A','B']) {
      const col=rows[0].indexOf(`Resposta ${letter}`);
      if(col<0)throw Error(`Missing table participant ${document.path}`);
      const criteria=rows.filter(row=>/Conclusão|Fundamentação|Condições/.test(row[0])).map(row=>numeric(row[col]));
      const total=numeric(rows.find(row=>row[0].startsWith('Nota total'))[col]);
      const classification=rows.find(row=>row[0]==='Classificação')[col];
      scores[order[letter]]={criteria,total,classification,criteriaSum:criteria.every(Number.isFinite)?criteria.reduce((a,b)=>a+b,0):null};
    }
    const normalized=document.text.replace(/\\\./g,'.');
    const resultSection=normalized.match(/## \d+\. Resultado\s+([\s\S]*?)(?=## \d+\. Justificativa|$)/)?.[1]?.trim();
    if(!resultSection)throw Error(`Missing result ${document.path}`);
    const winnerLetter=resultSection.match(/([AB]) venceu/)?.[1]||resultSection.match(/Vencedora: Resposta ([AB])/)?.[1];
    const winner=winnerLetter?order[winnerLetter]:/Empate/i.test(resultSection)?'tie':'inconclusive';
    // Review identifies A/B explicitly; reject attribution conflicts instead of assuming alternation.
    const actualA=review.text.match(/resposta A \(([^)]+)\)/i)?.[1];
    if(!actualA || (actualA.includes('Claude')?'alternative':'vadechat')!==order.A)throw Error(`Ambiguous/conflicting effective A/B ${review.path}`);
    const observations=[];
    for(const [participant,s] of Object.entries(scores))if(s.total!==s.criteriaSum)observations.push(`${participant}: total declarado ${s.total}; soma ${s.criteriaSum}.`);
    const byPoints=scores.vadechat.total===scores.alternative.total?'tie':scores.vadechat.total>scores.alternative.total?'vadechat':'alternative';
    if(byPoints!==winner)observations.push('O vencedor declarado não corresponde à maior pontuação; ambos preservados.');
    const [problem,impact,action]=reviews[mode][i];
    comparisons[mode]={order,orderEvidence:[alternation.path,review.path],document,scores,winner,resultOriginal:resultSection,tieKind:winner==='tie'?(/abstenção/i.test(resultSection)?'abstention':'ordinary'):null,observations,response:read(`Respostas/Vadechat/${folder}/R${n}_VC_${folder}.txt`),alternative,review,reviewKind:'Comentários de auditoria; sem pontuação alternativa explícita.',reviewSummary:problem,reviewProblem:problem,reviewImpact:impact,reviewAction:action};
  }
  return {id:qid,title,order,question,human,alternative,referenceText,administrativeText,mandatoryFacts,referenceNotes,comparisons};
});
const benchmark={id,date:'2026-10-13',executionDate:'2026-10-13',publicationDate:'2026-10-13',dateBasis:'Data de execução confirmada pelo executor nesta conversa. Publicação em 13/10/2026. Datas de modificação dos arquivos não são tratadas como horários da execução.',alternativeLabel:'Claude gratuito',judgeLabel:'ChatGPT Grátis · modelo não identificado',reviewerTitle:'Revisão metodológica — GPT-6.1 Alta',
  subtitle:'O que o VadeChat entrega em comparação com uma alternativa gratuita acessível ao usuário?',
  caveat:'Execução exploratória com cinco perguntas. As notas medem concordância com a referência humana, sem validação jurídica independente ou comprovação de superioridade geral dos participantes.',
  summary:'Nos julgamentos originais, o Ágil venceu Q02, Q03 e Q04 e perdeu Q01 e Q05; o Pleno venceu Q02, Q03 e Q04, empatou Q01 e perdeu Q05. O VadeChat acrescentou requisitos documentais e cadastrais do gabarito em Q03/Q04, mas ficou atrás do Claude em Q01 no modo Ágil e em Q05 nos dois modos. As revisões questionam descontos, classificações e a sustentação de vencedores, especialmente Q02 e Q05. As médias próximas do Ágil não sustentam superioridade geral; a vantagem média do Pleno também exige cautela.',
  metadata:{source:'Condições de acesso e modelo exibido informados pelo executor; os originais históricos não foram alterados.',reference:'Respostas humanas fornecidas; sem validação externa neste teste',participants:['VadeChat Ágil','VadeChat Pleno','Claude gratuito'],alternativeModel:'Sonnet 5.5 Médio · seleção padrão exibida durante a execução',judge:'ChatGPT Grátis · modelo não identificado',reviewer:'GPT-6.1 Alta (grafia dos arquivos: GPT-6.1 Sol Alta)',reviewerRole:'Autor das notas de auditoria dos julgamentos. Não é o juiz nem gerou as respostas do participante Claude.',missing:'Horários exatos, duração, configurações de geração do VadeChat, ferramentas e condições detalhadas de sessão: não registrado.'},
  conditions:['Claude utilizado com login no plano gratuito, mantendo a seleção padrão exibida naquela execução: Sonnet 5.5 Médio. Não houve escolha deliberada de outro modelo.','No benchmark VC × ChatGPT anterior, o ChatGPT gratuito foi utilizado sem login e não informou o modelo; o Claude desta rodada exigiu login e exibiu o modelo.','Esses dados descrevem condições observadas nas execuções e não afirmam modelos padrão ou condições atuais das plataformas.','Os dez julgamentos são do ChatGPT Grátis, cujo modelo não foi identificado. As notas de revisão são de GPT-6.1 Alta.'],
  protocolMetadataNote:'A alternância identifica ChatGPT Grátis como juiz. As notas identificam GPT-6.1 Sol Alta como autor da revisão. Os rótulos foram normalizados na interface sem modificar os arquivos. A identidade do modelo do juiz não foi registrada.',
  criteria:[{label:'Conclusão e orientação prática',max:4},{label:'Fundamentação e informações essenciais',max:4},{label:'Condições, limites e ressalvas',max:2}],protocol,alternation,questions,
  reuseNote:'Há um único arquivo de resposta do Claude por pergunta, associado aos dois embates. As cinco respostas e seus SHA-256 são idênticos em ambos os conjuntos; a mesma pergunta e referência também são reutilizadas.',
  varianceDescription:'Identidade conferida pelos textos integrais e SHA-256 dos arquivos associados. Q01: 10,0 → 9,5; Q03: 4,5 → 5,5; Q04: 7,0 → 6,0. As revisões apontam necessidade de calibrar a pontuação individual do juiz. A causa da oscilação não foi demonstrada; as duas séries permanecem separadas.',
  conclusion:'Nesta amostra, o VadeChat ofereceu mais conteúdo documental e cadastral alinhado ao gabarito em Q03/Q04 e recebeu vitórias originais em Q02. O Claude foi favorecido em Q01 contra Ágil e em Q05 nos dois modos; o Pleno empatou Q01. As revisões dão sustentação à cobertura observada, mas questionam a leitura de trechos, os descontos e, em Q05, o vencedor. Os dados não permitem afirmar superioridade jurídica global, custo-benefício ou economia de tempo.',
  limitations:['A referência humana não foi validada externamente. O teste mede concordância com esse material; tampouco a revisão de outra IA constitui validação jurídica independente.','Informações adicionais não verificáveis pela referência não recebem prêmio ou penalidade por si. Fundamentação normativa diferente não é automaticamente falsa. Extensão e número de citações não devem ser favorecidos.','As notas de revisão auditam os julgamentos e não substituem pontuações, classificações ou vencedores originais. Não foram produzidas respostas ou avaliações novas.','São cinco perguntas em dois embates, totalizando dez julgamentos. As médias usam cinco notas por participante por embate; resultados usam cinco comparações, e classificações usam cinco respostas avaliadas em cada série.','Cinco perguntas não sustentam conclusões gerais sobre superioridade jurídica ou desempenho global. Não houve medição sistemática de custo, latência ou limites dos planos gratuitos.','Não há prompts completos efetivamente enviados. A composição disponível é um prompt reconstruído a partir de global_prompt.txt, pergunta, corpo substantivo da referência, fatos obrigatórios/pesos e respostas A/B. Variações e observações administrativas são preservadas nos originais, mas não incorporadas como pergunta substantiva. A inserção efetiva de fatos e pesos não está registrada.','Q03: a revisão aponta que a referência não delimita a aplicação da frase final sobre 30 dias para certidão específica. Essa lacuna foi preservada.'],
};
const report={id,date:benchmark.date,dateNote:'execução confirmada · publicação 13/10',title:'Run do Benchmark com Amostra de 5 Perguntas: Ágil × Claude & Pleno × Claude',module:'VadeChat',status:'Execução exploratória',count:'5 perguntas · 10 julgamentos comparativos',benchmarkId:id,summary:benchmark.summary,highlights:[],note:benchmark.caveat,files:[{label:'Relatório completo, protocolo e evidências integrais · PDF',path:`/reports/${id}.pdf`,kind:'pdf',origin:'generated'}],findings:questions.map(q=>({id:q.id,title:q.title,description:`${q.id} · ${q.title}. Resultado original do ChatGPT Grátis preservado; revisão GPT-6.1 Alta apresentada separadamente.`,status:'Comparação documentada',evidenceIds:[],retest:{execution:'not-applicable'},kind:'Benchmark exploratório'}))};
for(const mode of ['agil','pleno']) {
  const v=statistics(questions,mode,'vadechat'),a=statistics(questions,mode,'alternative');
  report.highlights.push(`${mode==='agil'?'Ágil':'Pleno'} × Claude gratuito: médias ${v.mean.toLocaleString('pt-BR',{minimumFractionDigits:1})} e ${a.mean.toLocaleString('pt-BR',{minimumFractionDigits:1})}; VadeChat ${v.wins} ${v.wins===1?'vitória':'vitórias'}, ${v.ties} ${v.ties===1?'empate':'empates'} e ${v.losses} ${v.losses===1?'derrota':'derrotas'}.`);
}
report.highlights.push('Claude recebe notas diferentes em Q01, Q03 e Q04; revisões questionam a sustentação dos vencedores em Q05.');
const catalog=JSON.parse(fs.readFileSync('content/reports.json','utf8'));
if(catalog.reports.some(r=>r.id===id))throw Error('Report already exists; update explicitly.');
catalog.reports.push(report);
fs.writeFileSync(`content/${id}.json`,JSON.stringify(benchmark,null,2)+'\n');
fs.writeFileSync('content/reports.json',JSON.stringify(catalog,null,2)+'\n');
console.log(`Imported ${documents.size} original files; ten original judgments; date confirmed by executor.`);
