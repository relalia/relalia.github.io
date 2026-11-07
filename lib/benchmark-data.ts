import legacy from '@/content/benchmark-2026-10-09.json';
import current from '@/content/benchmark-claude-2026-10-13.json';
import type { Benchmark, Mode } from './benchmark';

// Normalize the historical schema in memory; its stored content and originals remain unchanged.
const normalizeParticipant = (key:string) => key==='chatgpt'?'alternative':key;
const historical = {
  ...legacy, executionDate:legacy.date,publicationDate:legacy.date,dateBasis:'Data fixa do relatório histórico de 09/10/2026.',
  alternativeLabel:'ChatGPT gratuito',judgeLabel:'Claude Sonnet 5.5 Médio',reviewerTitle:'Revisão metodológica — GPT 6.1 Sol Alto',
  summary:'O Ágil obteve maior cobertura que o ChatGPT gratuito em Q05, empatou em Q03 e perdeu em Q01, Q02 e Q04. O Pleno venceu em Q04 e Q05, empatou em Q01 e Q03 e perdeu em Q02. Segundo o juiz, o Pleno cobriu o limite fiscal de Q04 e mais requisitos da ficha de firma em Q05; ainda omitiu situações de especial atenção em Q02. As revisões questionam classificações e descontos em parte dos julgamentos.',
  metadata:{...legacy.metadata,alternativeModel:legacy.metadata.chatgptModel},conditions:[],conclusion:'',
  protocolMetadataNote:'Metadados compatíveis com os arquivos: a alternância identifica Claude Sonnet 5.5 Médio; as revisões usam a grafia histórica “GPT-6.1 Sol Alta”. A modalidade gratuita do ChatGPT e o acesso pago do revisor foram informados pelo executor. Não foi identificada indicação conflitante de modelo do participante nos arquivos.',
  reuseNote:'As mesmas cinco respostas do ChatGPT gratuito foram reutilizadas nos dois embates.',
  varianceDescription:'Variação observada no julgamento do ChatGPT gratuito. Os textos avaliados são os mesmos em ambos os embates; a causa dessa variação não foi isolada.',
  questions:legacy.questions.map(q=>({...q,alternative:q.chatgpt,referenceText:q.human.text,administrativeText:'',mandatoryFacts:[],referenceNotes:'',
    order:{A:normalizeParticipant(q.order.A),B:normalizeParticipant(q.order.B)},
    comparisons:Object.fromEntries((['agil','pleno'] as Mode[]).map(mode=>{
      const c=q.comparisons[mode];
      return [mode,{...c,scores:{vadechat:c.scores.vadechat,alternative:c.scores.chatgpt},winner:normalizeParticipant(c.winner),alternative:q.chatgpt,order:{A:normalizeParticipant(q.order.A),B:normalizeParticipant(q.order.B)},orderEvidence:[legacy.alternation.path],observations:[],tieKind:c.winner==='tie'?'ordinary':null,reviewProblem:'',reviewImpact:'',reviewAction:''}];
    })),
  })),
} as unknown as Benchmark;

export function getBenchmark(id:string):Benchmark {
  if(id===current.id)return current;
  if(id===legacy.id)return historical;
  throw Error(`Benchmark não cadastrado: ${id}`);
}
