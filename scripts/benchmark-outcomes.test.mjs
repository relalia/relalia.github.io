import assert from 'node:assert/strict';
import { test } from 'node:test';
import catalog from '../content/reports.json' with { type: 'json' };
import chatgpt from '../content/benchmark-2026-10-09.json' with { type: 'json' };
import claude from '../content/benchmark-claude-2026-10-13.json' with { type: 'json' };
import chatgptRetest from '../content/benchmark-comparativo-2026-10-14.json' with { type: 'json' };
import claudeRetest from '../content/benchmark-comparativo-claude-2026-10-15.json' with { type: 'json' };
import overview from '../content/sintese-benchmarks-interface-2026-10-16.json' with { type: 'json' };
import { executiveOutcome, exploratoryOutcome, resultByWins, retestOutcome } from '../lib/benchmark-outcomes.mjs';

const executives = catalog.reports.filter(report => report.executive);
const byId = id => executives.find(report => report.id === id).executive;
const byMode = (benchmark, key) => executiveOutcome(benchmark.modes.find(mode => mode.key === key), benchmark.executionConfirmed);
const values = ({ winner, record, vcMean, opponentMean, comparable, coverageTotal }) =>
  [winner, record.wins, record.ties, record.losses, vcMean, opponentMean, comparable, coverageTotal];

test('executive results use wins, including ties with different score averages', () => {
  const deepseek = byId('benchmark-deepseek-v4-1-flash-2026-11-18');
  assert.deepEqual(values(byMode(deepseek, 'agil')), ['opponent', 2, 0, 3, 7.2, 6.8, 5, 5]);
  assert.deepEqual(values(byMode(deepseek, 'pleno')), ['tie', 2, 1, 2, 8.8, 6, 5, 5]);
  const sonnet = byId('benchmark-claude-sonnet-5-5-2026-11-04');
  assert.deepEqual(values(byMode(sonnet, 'pleno')), ['tie', 2, 0, 2, 9, 7.25, 4, 5]);
  assert.match(sonnet.completionNote, /Q04 Pleno \(9,00 a 9,00\)/);
  const sol = byId('benchmark-chatgpt-sol-2026-11-03');
  const provisional = executiveOutcome(sol.modes[0]);
  assert.equal(provisional.partial, true);
  assert.equal(byMode(sol, 'agil').partial, false);
  assert.deepEqual(values(byMode(sol, 'agil')), ['tie', 2, 1, 2, 7.2, 7, 5, 5]);
});

test('seven executive rounds reconcile comparable bouts and results by mode', () => {
  const expected = { agil: { vadechat: 2, tie: 3, opponent: 2 }, pleno: { vadechat: 4, tie: 3, opponent: 0 } };
  for (const [mode, totals] of Object.entries(expected)) {
    const tally = { vadechat: 0, tie: 0, opponent: 0 };
    for (const { executive } of executives.filter(({ executive: { runDate } }) => runDate >= '2026-10-28' && runDate <= '2026-11-18')) {
      const outcome = byMode(executive, mode);
      assert.equal(outcome.record.wins + outcome.record.ties + outcome.record.losses, outcome.comparable);
      tally[outcome.winner]++;
    }
    assert.deepEqual(tally, totals);
  }
});

test('exploratory benchmarks and retests use original outcomes and preserve each execution', () => {
  assert.deepEqual(values(exploratoryOutcome(claude.questions, 'agil')), ['vadechat', 3, 0, 2, 7, 7.1, 5, 5]);
  for (const [index, [original, retest]] of [[chatgpt, chatgptRetest], [claude, claudeRetest]].entries()) {
    for (const mode of ['agil', 'pleno']) {
      const summary = retest.summary[mode];
      assert.deepEqual(retestOutcome(retest.rows, mode, 'old', summary.denominator), exploratoryOutcome(original.questions, mode));
      for (const run of ['old', 'new']) {
        const result = retestOutcome(retest.rows, mode, run, summary.denominator);
        const { vc, tie, opponent } = summary.outcomes[run];
        assert.deepEqual(result.record, { wins: vc, ties: tie, losses: opponent });
        assert.equal(result.comparable, vc + tie + opponent);
        const synthesis = overview.benchmarks[index];
        assert.deepEqual(retestOutcome(synthesis.rows, mode, run, synthesis.summaries[mode].denominator), result);
      }
    }
  }
});

test('known ties, empty series, partial results and missing judgments stay distinct', () => {
  const input = { wins: 0, ties: 2, losses: 0, n: 2, coverageTotal: 5, vcMean: 8, opponentMean: 7 };
  assert.equal(resultByWins(input).winner, 'tie');
  assert.equal(resultByWins({ ...input, n: 0, ties: 0 }).winner, 'none');
  assert.deepEqual(values(resultByWins({ n: 0, coverageTotal: 5, vcMean: 8, opponentMean: 7 })), ['none', 0, 0, 0, 8, 7, 0, 5]);
  assert.equal(resultByWins(input, true).partial, true);

  const missing = resultByWins({ ...input, ties: null });
  assert.equal(missing.winner, 'unknown');
  assert.deepEqual([missing.vcMean, missing.opponentMean, missing.comparable], [8, 7, 2]);
  assert.equal(resultByWins({ ...input, losses: 1 }).record, null);

  const vc = { total: 8 }, opponent = { total: 7 };
  const series = winner => [{ mode: 'agil', old: { winner, vc, opponent } }];
  assert.equal(retestOutcome(series(undefined), 'agil', 'old', 1).winner, 'unknown');
  assert.equal(retestOutcome(series('inconclusive'), 'agil', 'old', 1).winner, 'none');
  assert.equal(retestOutcome(series('vc'), 'agil', 'old', 2).winner, 'unknown');
  assert.equal(executiveOutcome({ ...input, pendingJudgments: 0, pendingReviews: 1, pendingDecisions: 0 }).partial, true);
});
