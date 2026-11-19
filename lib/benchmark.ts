import type current from '@/content/benchmark-claude-2026-10-13.json';
import { reportedJudgment } from './benchmark-outcomes.mjs';
export type Mode = 'agil' | 'pleno';
export type Participant = 'vadechat' | 'alternative';
export type Benchmark = typeof current;
export type BenchmarkQuestion = Benchmark['questions'][number];
export type SourceDocument = typeof current.protocol;
export const modeLabel = (mode: Mode) => mode === 'agil' ? 'Ágil' : 'Pleno';
export const participantLabel = (mode: Mode, participant: Participant, data:Benchmark) => participant === 'alternative' ? data.alternativeLabel : `Vadechat ${modeLabel(mode)}`;
export function resultLabel(mode: Mode, winner: string, data: Benchmark) {
  const result = reportedJudgment(winner);
  if (result === 'vadechat' || result === 'opponent') {
    const participant = result === 'vadechat' ? 'vadechat' : 'alternative';
    return `${participantLabel(mode, participant, data)} venceu`;
  }
  return { tie: 'Empate', inconclusive: 'Inconclusivo', pending: 'Julgamento pendente', unknown: 'Resultado não informado' }[result];
}

export function reconstructPrompt(q:BenchmarkQuestion,mode:Mode,data:Benchmark) {
  const texts={alternative:q.alternative.text,vadechat:q.comparisons[mode].response.text};
  const order=q.comparisons[mode].order;
  const reference=q.referenceText+(q.mandatoryFacts.length?'\n\nFatos obrigatórios:\n'+q.mandatoryFacts.map(f=>`${f.text}\npeso ${f.weight.toFixed(2)}`).join('\n'):'')+(q.referenceNotes?'\n\nObservação de revisão da referência (metadado fornecido):\n'+q.referenceNotes:'');
  return data.protocol.text.replace('[cole a pergunta]',()=>q.question.text).replace('[cole a resposta humana]',()=>reference).replace('[cole a primeira resposta]',()=>texts[order.A as Participant]).replace('[cole a segunda resposta]',()=>texts[order.B as Participant]);
}
