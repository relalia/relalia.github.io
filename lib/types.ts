export type Module = 'VadeChat' | 'Atlas' | 'Base de Conhecimento' | 'Alia';
export interface RetestState {
  execution: 'not-performed' | 'performed' | 'not-applicable';
  result?: string;
}

export interface Attachment {
  label: string;
  path: string;
  kind: 'pdf' | 'xlsx';
  origin: 'original' | 'generated';
  originalName?: string;
  sha256?: string;
}

export interface Evidence {
  id: string;
  reportId: string;
  findingIds: string[];
  description: string;
  kind: 'image' | 'video' | 'description';
  path: string | null;
  originalName?: string;
  sha256?: string;
  protocol?: string;
}

export interface Comparison {
  reportId: string;
  findingId: string;
  label: string;
}

export interface Finding {
  id: string;
  title: string;
  description: string;
  observationLabel?: string;
  hypothesis?: string;
  suggestion?: string;
  basis?: string;
  kind?: string;
  severity?: string | null;
  context?: string;
  evidenceIds: string[];
  relatedIds?: string[];
  retest: RetestState;
  comparisons?: Comparison[];
  expected?: string | null;
  verification?: string | null;
  status: string;
  sourceFields?: { label: string; value: string }[];
  originalRecord?: Record<string, string | string[]>;
}

export interface Report {
  executive?: ExecutiveBenchmark;
  latency?: LatencyBenchmark;
  benchmarkSources?: { reportId: string; label: string }[];
  overviewId?: string;
  comparisonId?: string;
  benchmarkId?: string;
  id: string;
  date: string;
  dateNote?: string;
  title: string;
  module: Module;
  status: string;
  count: string;
  summary: string;
  highlights: string[];
  note?: string;
  files: Attachment[];
  findings: Finding[];
}

interface LatencyParticipant {
  label: string;
  meanMs: number;
  totalMs: number;
}

export interface LatencyBenchmark {
  vadechat: LatencyParticipant;
  opponent: LatencyParticipant & { model: string };
  scaleSeconds: number;
  questions: { label: string; vadechatMs: number; opponentMs: number }[];
}

export type TimelineReport = Pick<Report, 'id' | 'date' | 'dateNote' | 'title' | 'module' | 'count'> & { dateLabel: string };

export interface ExecutiveCriterion {
  code: string;
  label: string;
  max: number;
  vc: number;
  opponent: number;
  n: number;
}

export interface ExecutiveMode {
  key: string;
  label: string;
  n: number;
  vcMean: number;
  opponentMean: number;
  wins: number;
  ties: number;
  losses: number;
  coverageTotal: number;
  pendingJudgments: number;
  inconclusive: number;
  outdated: number;
  contradictionsVc: number;
  contradictionsOpponent: number;
  abstentionsVc: number;
  abstentionsOpponent: number;
  reviewsCompleted: number;
  reviewsTotal: number;
  pendingReviews: number;
  contests: number;
  pendingDecisions: number;
  criteria: ExecutiveCriterion[];
}

export interface ExecutiveBenchmark {
  completionNote?: string;
  sourceStatusNote?: string;
  pendingNotice?: string;
  title: string;
  runDate: string;
  questions: number;
  scaleMax: number;
  opponent: string;
  roles: { role: string; platform: string; model: string | null; note?: string }[];
  modes: ExecutiveMode[];
  insights: { title: string; text: string }[];
  precisionNote: string;
  caveat: string;
  limitations: string[];
  source: { path: string; sha256: string; pages: number; qualityPage?: number; conclusionsPage?: number; series: string; runId: string; executionId: string; revision: number };
  operations: {
    rows: { role: string; attempts: number; failedOrUncertain: number; tokensIn: number; tokensOut: number; tokensTotal: number; providerCostUsd: number; seconds: number }[];
    generation: { mode: string; attempts: number; tokensIn: null; tokensOut: null; costUsd: null; seconds: null }[];
    budget: { limitUsd: number; consumedReservedUsd: number; remainingUsd: number };
    note: string;
  };
}
