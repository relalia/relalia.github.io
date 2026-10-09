// Import once from executor files; never modify source files or replace the judge's results.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const source = process.argv[2];
if (!source) throw Error('Usage: node scripts/import-benchmark.mjs SOURCE_DIRECTORY');
const id = 'benchmark-2026-10-09';
const documents = {};
function read(relative) {
  if (documents[relative]) return documents[relative];
  const target = `/originals/benchmark/${id}/${relative}`;
  const result = spawnSync(process.execPath, ['scripts/register-original.mjs', path.join(source, relative), target], {encoding:'utf8'});
  if (result.status !== 0) throw Error(result.stderr || result.stdout);
  documents[relative] = {...JSON.parse(result.stdout), text:fs.readFileSync(path.join(source, relative),'utf8')};
  return documents[relative];
}
const protocol = read('Aval/global_prompt.txt');
const alternation = read('Aval/answer_alternation.txt');
const clean = cell => cell.replace(/\*\*/g,'').trim();
function parseJudgment(document, order) {
  const lines = document.text.split(/\r?\n/);
  const table = lines.filter(line=>line.startsWith('|')).map(line=>line.split('|').slice(1,-1).map(clean));
  const scores = {};
  if (table[0][0] === 'Resposta') {
    for (const row of table.filter(row=>/^[AB]$/.test(row[0]))) {
      scores[row[0]] = {criteria:row.slice(1,4).map(Number),total:Number(row[4]),classification:row[5]};
    }
  } else {
    const criteria = table.filter(row=>/^[123]\./.test(row[0]));
    const total = table.find(row=>row[0]==='Nota total');
    const classification = table.find(row=>row[0]==='Classificação');
    for (const [index,letter] of ['A','B'].entries()) scores[letter] = {
      criteria:criteria.map(row=>Number(row[index+1])),total:Number(total[index+1]),classification:classification[index+1],
    };
  }
  for (const score of Object.values(scores)) {
    if (score.criteria.length !== 3 || !Number.isFinite(score.total) || score.criteria.some(n=>!Number.isFinite(n))) throw Error(`Incomplete score: ${document.path}`);
    score.criteriaSum = score.criteria.reduce((a,b)=>a+b,0);
  }
  const result = document.text.match(/## 3\. Resultado\s+([^\r\n]+)/)?.[1];
  if (!result) throw Error(`Missing result: ${document.path}`);
  const winnerLetter = result.includes('A venceu') ? 'A' : result.includes('B venceu') ? 'B' : null;
  const winner = winnerLetter ? order[winnerLetter] : result.includes('Empate') ? 'tie' : 'inconclusive';
  return {document, scores:{vadechat:scores[order.A==='vadechat'?'A':'B'],chatgpt:scores[order.A==='chatgpt'?'A':'B']},resultOriginal:result,winner};
}
const titles = ['Averbação de casamento','Comunicação ao COAF','Certidão municipal de Morrinhos','Inventário e multa do ITCD','Abertura de firma'];
const reviews = {
  agil:[
    'O revisor questiona a classificação Divergente e a demonstração dos descontos do Ágil; considera a vantagem do ChatGPT provável pela cobertura do gabarito.',
    'O revisor sustenta a vitória do ChatGPT; limita “única hipótese” ao que está explicitado no gabarito e ressalva informações adicionais não verificáveis.',
    'O revisor considera o empate coerente, mas ressalva a tolerância à consequência registral implícita ao atribuir nota máxima.',
    'O revisor questiona Parcialmente conforme para o ChatGPT por uma contradição central e a fundamentação de Divergente para o Ágil. Vitória em pontos não significa conformidade.',
    'O revisor sustenta a vantagem do Ágil na cobertura, mas aponta que a referência não responde à validade da ficha e não permite julgar esse ponto.',
  ],
  pleno:[
    'O revisor questiona a leitura da ressalva notarial do Pleno como contradição direta e aponta que o ChatGPT cita o art. 167, II, registrado como ausente pelo juiz.',
    'O revisor sustenta a vitória do ChatGPT, mas considera discutível o desconto por cobertura semântica e destaca a variação de 10 para 9 na mesma resposta.',
    'O revisor considera o empate coerente e ressalta que prenotação e nota devolutiva foram tratadas como informações não verificáveis, sem alterar a nota.',
    'O revisor sustenta a vitória do Pleno, aponta a mudança de nota e classificação do ChatGPT, possível desconto duplicado no Pleno e imprecisão sobre o 60º dia.',
    'O revisor sustenta a vantagem do Pleno na cobertura, mas questiona Divergente para o ChatGPT e a nota máxima do Pleno apesar de omissões. Validade da ficha não é julgável pela referência.',
  ],
};
const questions = titles.map((title,index)=>{
  const number = String(index+1).padStart(2,'0');
  const qid = `Q${number}`;
  const match = alternation.text.match(new RegExp(`${qid}: A \\((ChatGPT|Vadechat)\\) x B \\((ChatGPT|Vadechat)\\)`));
  if (!match) throw Error(`Missing A/B: ${qid}`);
  const order = {A:match[1]==='ChatGPT'?'chatgpt':'vadechat',B:match[2]==='ChatGPT'?'chatgpt':'vadechat'};
  const comparisons = {};
  for (const [mode,folder] of [['agil','Agil'],['pleno','Pleno']]) {
    const base = `Aval/VC_${folder}_x_ChatGPT`;
    comparisons[mode] = {...parseJudgment(read(`${base}/Pontuacoes/R${number}_VC_${folder}_x_ChatGPT.txt`),order),
      response:read(`Respostas/Vadechat/${folder}/R${number}_VC_${folder}.txt`),
      review:read(`${base}/Notas_GPT6.1/R${number}_VC_${folder}_x_ChatGPT_Nota_GPT6.1.txt`),
      reviewKind:'Comentários e reapresentação de resultados originais; sem pontuação alternativa explícita.',
      reviewSummary:reviews[mode][index],
    };
  }
  return {id:qid,title,order,question:read(`Perguntas/${qid}.txt`),human:read(`Respostas/Humano/R${number}_Humano.txt`),chatgpt:read(`Respostas/ChatGPT/R${number}_ChatGPT.txt`),comparisons};
});
const benchmark = {id,date:'2026-10-09',subtitle:'O que o VadeChat entrega em comparação com uma alternativa gratuita acessível ao usuário?',
  caveat:'Execução exploratória com cinco perguntas. As notas medem conformidade com a referência humana, sem comprovação independente da correção jurídica ou superioridade geral dos participantes.',
  metadata:{source:'Informado pelo executor na instrução de implementação; não altera os arquivos históricos.',reference:'Respostas humanas fornecidas pelo executor',participants:['Vadechat Ágil','Vadechat Pleno','ChatGPT gratuito'],chatgptModel:'modelo não identificado',judge:'Claude Sonnet 5.5 · nível Médio',reviewer:'GPT 6.1 Sol · nível Alto · acesso pago',reviewerRole:'Revisão posterior dos julgamentos; não gerou as respostas do participante ChatGPT.',missing:'Horários, duração, configurações de geração dos participantes, ferramentas e condições de sessão: não registrado.'},
  criteria:[{label:'Conclusão e orientação prática',max:4},{label:'Fundamentação e informações essenciais presentes na referência',max:4},{label:'Condições, limites e ressalvas relevantes presentes na referência',max:2}],
  protocol,alternation,questions,
  limitations:[
    'Comparação exploratória de experiências de uso; não é uma comparação controlada entre modelos com recursos computacionais equivalentes.',
    'As mesmas cinco respostas do ChatGPT gratuito foram reutilizadas nos dois embates. As dez comparações não são dez perguntas independentes.',
    'O revisor também é uma IA e sua revisão não constitui validação jurídica independente.',
    'A execução não isola efeitos do plano gratuito, do modo Pleno ou da potência dos modelos. Não há dados de custo, tempo, latência ou produtividade.',
    'O protocolo disponível é um modelo com campos para colagem. Os prompts completos efetivamente enviados não constam dos arquivos; as composições exibidas são prompts reconstruídos a partir dos arquivos.',
    'Q05: segundo as revisões, a referência humana não responde à validade da ficha de firma. Esse aspecto permanece inconclusivo na revisão, sem substituir os resultados originais.',
    'O revisor aponta problemas de classificação, interpretação e descontos. Os julgamentos originais permanecem preservados, inclusive quando questionados.',
  ],
};
fs.writeFileSync(`content/${id}.json`,JSON.stringify(benchmark,null,2)+'\n');
const catalog = JSON.parse(fs.readFileSync('content/reports.json','utf8'));
const report = {id,date:benchmark.date,title:'Run do Benchmark com Amostra de 5 Perguntas: Ágil x ChatGPT & Pleno x ChatGPT',module:'VadeChat',status:'Execução exploratória',count:'5 perguntas · 10 julgamentos comparativos',benchmarkId:id,
  summary:'Nesta amostra, o ChatGPT gratuito venceu três comparações contra o Ágil; o Pleno venceu duas contra o ChatGPT gratuito. Q03 empatou nos dois embates. Os julgamentos medem cobertura, omissões e contradições frente à referência humana, com ressalvas metodológicas registradas separadamente.',
  highlights:['Ágil × ChatGPT gratuito: médias 4,6 e 7,0; uma vitória do Ágil, três do ChatGPT e um empate.','Pleno × ChatGPT gratuito: médias 7,4 e 5,8; duas vitórias do Pleno, uma do ChatGPT e dois empates.','A mesma resposta do ChatGPT recebeu notas diferentes em Q02, Q04 e Q05.'],
  note:benchmark.caveat,files:[{label:'Relatório do benchmark e evidências integrais · PDF',path:`/reports/${id}.pdf`,kind:'pdf',origin:'generated'}],
  findings:questions.map(q=>({id:q.id,title:q.title,description:`${q.id} · ${q.title}. Julgamentos originais preservados e revisão metodológica disponível separadamente.`,status:'Comparação documentada',evidenceIds:[],retest:{execution:'not-applicable'},kind:'Benchmark exploratório'})),
};
const existing = catalog.reports.findIndex(r=>r.id===id);
if (existing<0) catalog.reports.push(report); else catalog.reports[existing]=report;
fs.writeFileSync('content/reports.json',JSON.stringify(catalog,null,2)+'\n');
console.log(`Imported ${Object.keys(documents).length} byte-preserved sources and ${questions.length*2} judgments.`);
