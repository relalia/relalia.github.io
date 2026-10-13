// The UI, tests and PDF source use these declared totals; no intermediate rounding.
export function statistics(questions, mode, participant) {
  const scores = questions.map(q=>q.comparisons[mode].scores[participant].total).filter(Number.isFinite);
  const wins = questions.filter(q=>q.comparisons[mode].winner===participant).length;
  const ties = questions.filter(q=>q.comparisons[mode].winner==='tie').length;
  const losses = questions.filter(q=>q.comparisons[mode].winner!==participant && ['vadechat','chatgpt','alternative'].includes(q.comparisons[mode].winner)).length;
  return {mean:scores.length ? scores.reduce((a,b)=>a+b,0)/scores.length : null,wins,ties,losses,count:scores.length};
}
export const formatScore = value => value == null ? 'não registrado' : value.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:2});

export function classificationCounts(questions,mode,participant) {
  const labels=['Conforme','Parcialmente conforme','Divergente','Abstenção','Inconclusiva'];
  return Object.fromEntries(labels.map(label=>[label,questions.filter(q=>q.comparisons[mode].scores[participant].classification===label).length]));
}
export function outcomeCounts(questions,mode) {
  return {ordinaryTies:questions.filter(q=>q.comparisons[mode].winner==='tie' && q.comparisons[mode].tieKind!=='abstention').length,
    abstentionTies:questions.filter(q=>q.comparisons[mode].winner==='tie' && q.comparisons[mode].tieKind==='abstention').length,
    inconclusive:questions.filter(q=>q.comparisons[mode].winner==='inconclusive').length,total:questions.length};
}
