import chatgpt from '@/content/benchmark-comparativo-2026-10-14.json';
import claude from '@/content/benchmark-comparativo-claude-2026-10-15.json';
import type {SourceDocument} from '@/lib/benchmark';

// Both reports share the presentation; historical datasets remain independent.
export type ComparisonData = Omit<typeof chatgpt, 'q02Contribution'|'editorial'|'documents'> & {
  documents: Record<string, SourceDocument>;
  alternativeLabel?: string;
  judgeLabel?: string;
  reviewerLabel?: string;
  runLabels?: {old: string; new: string};
  editorial: Omit<typeof chatgpt.editorial, 'title'|'subtitle'> & {
    denominatorNote?: string;
    outcomeNote?: string;
    roles?: string;
    reviewHighlights?: string[];
  };
};
export function getComparison(id: string | undefined): ComparisonData {
  if (id === claude.id) return claude;
  if (id === chatgpt.id) return chatgpt;
  throw new Error(`Comparativo não cadastrado: ${id}`);
}
