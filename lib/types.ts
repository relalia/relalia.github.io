export type Module = 'VadeChat' | 'Atlas' | 'Base de Conhecimento';
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
