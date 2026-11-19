const isCount = (value) => Number.isSafeInteger(value) && value >= 0;
const average = (values) => {
  const scores = values.filter(Number.isFinite);
  return scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null;
};

/**
 * @param {{wins?: number | null, ties?: number | null, losses?: number | null, n?: number,
 * coverageTotal: number, vcMean: number | null, opponentMean: number | null}} series
 * @param {boolean} [partial]
 */
export function resultByWins({ wins, ties, losses, n, coverageTotal, vcMean, opponentMean }, partial = false) {
  const comparable = typeof n === 'number' && isCount(n) && n <= coverageTotal ? n : null;
  const counts = [wins, ties, losses];
  const empty = comparable === 0 && counts.every(count => count == null || count === 0);
  const complete = typeof wins === 'number' && typeof ties === 'number' && typeof losses === 'number'
    && counts.every(isCount) && wins + ties + losses === comparable;
  const record = complete ? { wins, ties, losses } : empty ? { wins: 0, ties: 0, losses: 0 } : null;
  /** @type {'unknown' | 'none' | 'vadechat' | 'opponent' | 'tie'} */
  const winner = !record ? 'unknown'
    : comparable === 0 ? 'none'
    : record.wins > record.losses ? 'vadechat'
    : record.wins < record.losses ? 'opponent'
    : 'tie';
  return { winner, partial, record, comparable, coverageTotal, vcMean, opponentMean };
}

/**
 * @param {{pendingJudgments: number, pendingReviews: number, pendingDecisions: number} & Parameters<typeof resultByWins>[0]} mode
 * @param {boolean} [executionConfirmed]
 */
export function executiveOutcome(mode, executionConfirmed = false) {
  const partial = mode.pendingJudgments > 0 || mode.pendingReviews > 0
    || (!executionConfirmed && mode.pendingDecisions > 0);
  return resultByWins(mode, partial);
}

/**
 * @param {{winner?: string | null, vcMean?: number, opponentMean?: number}[]} judgments
 * @param {number} coverageTotal
 */
function judgmentOutcome(judgments, coverageTotal) {
  const wins = judgments.filter(({ winner }) => winner === 'vadechat' || winner === 'vc').length;
  const ties = judgments.filter(({ winner }) => winner === 'tie').length;
  const losses = judgments.filter(({ winner }) => ['opponent', 'alternative', 'chatgpt'].includes(winner ?? '')).length;
  const excluded = judgments.filter(({ winner }) => winner === 'inconclusive').length;
  const comparable = wins + ties + losses;
  return resultByWins({
    wins, ties, losses, coverageTotal,
    n: comparable + excluded === coverageTotal && judgments.length === coverageTotal ? comparable : undefined,
    vcMean: average(judgments.map(judgment => judgment.vcMean)),
    opponentMean: average(judgments.map(judgment => judgment.opponentMean)),
  });
}

/**
 * @param {{comparisons: Record<string, {winner?: string, scores: Record<string, {total: number}>}>}[]} questions
 * @param {string} mode
 */
export function exploratoryOutcome(questions, mode) {
  return judgmentOutcome(questions.map(question => {
    const judgment = question.comparisons[mode];
    return {
      winner: judgment?.winner,
      vcMean: judgment?.scores.vadechat?.total,
      opponentMean: (judgment?.scores.alternative ?? judgment?.scores.chatgpt)?.total,
    };
  }), questions.length);
}

/**
 * @param {{mode: string, old: {winner?: string, vc: {total: number}, opponent: {total: number}},
 * new: {winner?: string, vc: {total: number}, opponent: {total: number}}}[]} rows
 * @param {string} mode
 * @param {'old' | 'new'} run
 * @param {number} coverageTotal
 */
export function retestOutcome(rows, mode, run, coverageTotal) {
  return judgmentOutcome(rows.filter(row => row.mode === mode).map(row => ({
    winner: row[run]?.winner,
    vcMean: row[run]?.vc?.total,
    opponentMean: row[run]?.opponent?.total,
  })), coverageTotal);
}
