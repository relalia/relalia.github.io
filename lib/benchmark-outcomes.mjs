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
  const comparable = isCount(coverageTotal) && typeof n === 'number' && isCount(n) && n <= coverageTotal ? n : null;
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
 * @param {string | null | undefined} winner
 * @returns {'vadechat' | 'opponent' | 'tie' | 'inconclusive' | 'pending' | 'unknown'}
 */
export function reportedJudgment(winner) {
  switch (winner) {
    case 'vadechat':
    case 'vc':
      return 'vadechat';
    case 'opponent':
    case 'alternative':
    case 'chatgpt':
      return 'opponent';
    case 'tie':
    case 'inconclusive':
    case 'pending':
      return winner;
    default:
      return 'unknown';
  }
}

/**
 * @param {{question: string, winner?: string | null, vcMean?: number, opponentMean?: number}[]} judgments
 * @param {number} coverageTotal
 */
function judgmentOutcome(judgments, coverageTotal) {
  /** @type {Map<string, typeof judgments[number] | null>} */
  const byQuestion = new Map();
  for (const judgment of judgments) {
    byQuestion.set(judgment.question, byQuestion.has(judgment.question) ? null : judgment);
  }
  const unique = [...byQuestion.values()];
  const counts = { vadechat: 0, opponent: 0, tie: 0, inconclusive: 0, pending: 0, unknown: 0 };
  for (const judgment of unique) counts[reportedJudgment(judgment?.winner)]++;
  const { vadechat: wins, tie: ties, opponent: losses } = counts;
  const comparable = wins + ties + losses;
  return resultByWins({
    wins, ties, losses, coverageTotal,
    n: counts.unknown === 0 && unique.length === coverageTotal ? comparable : undefined,
    vcMean: average(unique.map(judgment => judgment?.vcMean)),
    opponentMean: average(unique.map(judgment => judgment?.opponentMean)),
  }, counts.pending > 0);
}

/**
 * @param {{id: string, comparisons: Record<string, {winner?: string, scores?: Record<string, {total: number | null}>}>}[]} questions
 * @param {string} mode
 */
export function exploratoryOutcome(questions, mode) {
  return judgmentOutcome(questions.map(question => {
    const judgment = question.comparisons[mode];
    return {
      question: question.id,
      winner: judgment?.winner,
      vcMean: judgment?.scores?.vadechat?.total ?? undefined,
      opponentMean: (judgment?.scores?.alternative ?? judgment?.scores?.chatgpt)?.total ?? undefined,
    };
  }), questions.length);
}

/**
 * @param {{question: string, mode: string, old?: {winner?: string, vc?: {total: number | null}, opponent?: {total: number | null}},
 * new?: {winner?: string, vc?: {total: number | null}, opponent?: {total: number | null}}}[]} rows
 * @param {string} mode
 * @param {'old' | 'new'} run
 * @param {number} coverageTotal
 */
export function retestOutcome(rows, mode, run, coverageTotal) {
  return judgmentOutcome(rows.filter(row => row.mode === mode).map(row => ({
    question: row.question,
    winner: row[run]?.winner,
    vcMean: row[run]?.vc?.total ?? undefined,
    opponentMean: row[run]?.opponent?.total ?? undefined,
  })), coverageTotal);
}
