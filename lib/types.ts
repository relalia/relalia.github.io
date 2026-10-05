export type Module = 'VadeChat' | 'Atlas';
export type RetestState = 'baseline' | 'pending' | 'completed';
export type EvidencePublication = 'published' | 'omitted';

export interface Attachment {
  label: string;
  path: string;
  kind: 'pdf';
}

export interface Evidence {
  id: string;
  findingIds: string[];
  description: string;
  image: string | null;
  publication: EvidencePublication;
}

export interface Finding {
  id: string;
  title: string;
  description: string;
  kind?: string;
  severity?: string | null;
  context?: string;
  evidenceIds: string[];
  relatedIds?: string[];
  retest: RetestState;
  comparisonId?: string | null;
  expected?: string | null;
  verification?: string | null;
  status?: string | null;
}

export interface Report {
  id: string;
  date: string;
  title: string;
  module: Module;
  status: string;
  count: string;
  summary: string;
  highlights: string[];
  files: Attachment[];
  findings: Finding[];
}
