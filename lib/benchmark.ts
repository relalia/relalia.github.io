import data from '@/content/benchmark-2026-10-09.json';
export const benchmark = data;
export type Mode = 'agil' | 'pleno';
export type Participant = 'vadechat' | 'chatgpt';
export type BenchmarkQuestion = typeof data.questions[number];
export type SourceDocument = typeof data.protocol;
export const modeLabel = (mode: Mode) => mode === 'agil' ? 'Ágil' : 'Pleno';
export const participantLabel = (mode: Mode, participant: Participant) => participant === 'chatgpt' ? 'ChatGPT gratuito' : `Vadechat ${modeLabel(mode)}`;
export const resultLabel = (mode: Mode, winner: string) => winner === 'tie' ? 'Empate' : winner === 'inconclusive' ? 'Inconclusivo' : `${participantLabel(mode, winner as Participant)} venceu`;
export function reconstructPrompt(q: BenchmarkQuestion, mode: Mode) {
  const texts = {chatgpt:q.chatgpt.text,vadechat:q.comparisons[mode].response.text};
  return data.protocol.text.replace('[cole a pergunta]',q.question.text).replace('[cole a resposta humana]',q.human.text).replace('[cole a primeira resposta]',texts[q.order.A as Participant]).replace('[cole a segunda resposta]',texts[q.order.B as Participant]);
}
