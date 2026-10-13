import legacy from '@/content/benchmark-2026-10-09.json';
import current from '@/content/benchmark-claude-2026-10-13.json';
export type Mode = 'agil' | 'pleno';
export type Participant = 'vadechat' | 'alternative';
export type Benchmark = typeof current;
export type BenchmarkQuestion = Benchmark['questions'][number];
export type SourceDocument = typeof current.protocol;
export const modeLabel = (mode: Mode) => mode === 'agil' ? 'Ágil' : 'Pleno';
export const participantLabel = (mode: Mode, participant: Participant, data:Benchmark) => participant === 'alternative' ? data.alternativeLabel : `Vadechat ${modeLabel(mode)}`;
export const resultLabel = (mode: Mode, winner: string, data:Benchmark) => winner === 'tie' ? 'Empate' : winner === 'inconclusive' ? 'Inconclusivo' : `${participantLabel(mode, winner as Participant,data)} venceu`;

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
export function reconstructPrompt(q:BenchmarkQuestion,mode:Mode,data:Benchmark) {
  const texts={alternative:q.alternative.text,vadechat:q.comparisons[mode].response.text};
  const order=q.comparisons[mode].order;
  const reference=q.referenceText+(q.mandatoryFacts.length?'\n\nFatos obrigatórios:\n'+q.mandatoryFacts.map(f=>`${f.text}\npeso ${f.weight.toFixed(2)}`).join('\n'):'')+(q.referenceNotes?'\n\nObservação de revisão da referência (metadado fornecido):\n'+q.referenceNotes:'');
  return data.protocol.text.replace('[cole a pergunta]',()=>q.question.text).replace('[cole a resposta humana]',()=>reference).replace('[cole a primeira resposta]',()=>texts[order.A as Participant]).replace('[cole a segunda resposta]',()=>texts[order.B as Participant]);
}
